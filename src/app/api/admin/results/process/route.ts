import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { parseFile } from "@/lib/race-parser";
import { calculateAll, parseFormulaFromForm } from "@/lib/rewards";
import { prisma } from "@/lib/prisma";
import { tiersFromDb } from "@/lib/class-tiers";
import { sendRaceResultsNotification } from "@/lib/discord-webhook";
import type { RaceResultSummary } from "@/lib/discord-webhook";
import type { ExtendedRawEntry } from "@/lib/rewards";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const durationRaw = formData.get("duration") as string | null;

    if (!file) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });

    let durationMin = durationRaw ? parseInt(durationRaw, 10) : NaN;

    const text = await file.text();
    let parsed;
    try {
      parsed = parseFile(file.name, text);
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Erreur de parsing." },
        { status: 400 }
      );
    }

    // Auto-detect duration from XML if not provided
    if (isNaN(durationMin) || durationMin <= 0) {
      if (parsed.meta.raceTimeMin && parsed.meta.raceTimeMin > 0) {
        durationMin = parsed.meta.raceTimeMin;
      } else {
        return NextResponse.json({ error: "Durée invalide." }, { status: 400 });
      }
    }

    const formula = parseFormulaFromForm(formData);
    const warningThreshold  = 4;
    const sanctionThreshold = 8;

    // Build extended entries
    const extendedEntries: ExtendedRawEntry[] = parsed.entries.map((e, idx) => ({
      ...e,
      carClass:     parsed.extended[idx]?.carClass,
      finishStatus: parsed.extended[idx]?.finishStatus,
    }));

    // Fetch XP tiers from DB (admin-configurable)
    const licenseConfigs = await prisma.licenseConfig.findMany({ orderBy: { order: "asc" } });
    const classXpTiers = tiersFromDb(licenseConfigs);

    // Fetch all existing players
    const lowerUsernames = new Set(parsed.entries.map((e) => e.username.toLowerCase()));
    const allPlayers = await prisma.player.findMany({ include: { team: true } });
    const players = allPlayers.filter((p) => lowerUsernames.has(p.username.toLowerCase()));
    const playerMap = new Map(players.map((p) => [p.username.toLowerCase(), p]));

    // Auto-create unknown players
    const unknownUsernames = Array.from(lowerUsernames).filter((u) => !playerMap.has(u));
    let autoCreated = 0;
    for (const lower of unknownUsernames) {
      const originalName = parsed.entries.find((e) => e.username.toLowerCase() === lower)?.username ?? lower;
      const created = await prisma.player.create({
        data: { username: originalName, reputation: 50 },
        include: { team: true },
      });
      playerMap.set(lower, created);
      autoCreated++;
    }

    // Fetch current class XP per player (for ladder tier calculation)
    const allPlayerIds = Array.from(playerMap.values()).map((p) => p.id);
    const classStats = await prisma.playerClassStats.findMany({
      where: { playerId: { in: allPlayerIds } },
      include: { player: { select: { username: true } } },
    });
    const classXpLookup = new Map<string, number>();
    const ladderPointsLookup = new Map<string, number>();
    for (const stat of classStats) {
      const key = `${stat.player.username.toLowerCase()}::${stat.carClass}`;
      classXpLookup.set(key, stat.classXp);
      ladderPointsLookup.set(key, stat.ladderPoints);
    }

    const perEntryClassXpMap = new Map<string, number>();
    for (const e of extendedEntries) {
      if (e.carClass) {
        const key = `${e.username.toLowerCase()}::${e.carClass}`;
        perEntryClassXpMap.set(e.username.toLowerCase(), classXpLookup.get(key) ?? 0);
      }
    }

    const calculated = calculateAll(extendedEntries, durationMin, formula, perEntryClassXpMap, classXpTiers);

    const enriched = calculated.map((entry) => ({
      ...entry,
      foundInDb: playerMap.has(entry.username.toLowerCase()),
    }));

    const toUpdate = enriched.filter((e) => e.foundInDb);
    const updatedPlayers = toUpdate.length;

    // ── Prisma transaction ────────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      const raceSession = await tx.raceSession.create({
        data: {
          durationMin,
          processedBy:      session.user.discordId ?? session.user.id,
          trackVenue:       parsed.meta.trackVenue ?? null,
          trackEvent:       parsed.meta.trackEvent ?? null,
          sessionType:      parsed.meta.sessionType ?? null,
          warningThreshold,
          sanctionThreshold,
        },
      });

      for (const entry of toUpdate) {
        const player = playerMap.get(entry.username.toLowerCase())!;
        const ext = parsed.extended.find((x) => x.username.toLowerCase() === entry.username.toLowerCase());

        const currentRep = player.reputation ?? 50;
        const newRep = Math.min(200, Math.max(0, currentRep + entry.reputationDelta));

        await tx.player.update({
          where: { id: player.id },
          data: {
            xp:            { increment: entry.xpGained },
            money:         { increment: entry.moneyGained },
            finishedRaces: { increment: 1 },
            totalRaces:    { increment: 1 },
            ...(entry.isClean ? { cleanRaces: { increment: 1 } } : {}),
            reputation:    newRep,
          },
        });

        await tx.raceResult.create({
          data: {
            playerId:        player.id,
            raceSessionId:   raceSession.id,
            position:        entry.position,
            xpGained:        entry.xpGained,
            moneyGained:     entry.moneyGained,
            isClean:         entry.isClean,
            carClass:        entry.carClass ?? null,
            incidents:       entry.incidents,
            reputationDelta: entry.reputationDelta,
            ladderDelta:     entry.ladderDelta,
            laps:            ext?.laps ?? null,
            bestLapTimeSec:  ext?.bestLapTimeSec ?? null,
            finishStatus:    ext?.finishStatus ?? null,
            teamName:        ext?.teamName ?? null,
          },
        });

        if (entry.carClass) {
          const statKey = `${entry.username.toLowerCase()}::${entry.carClass}`;
          const currentClassXp      = classXpLookup.get(statKey) ?? 0;
          const currentLadderPoints = ladderPointsLookup.get(statKey) ?? 0;
          const newLadderPoints     = Math.max(0, currentLadderPoints + entry.ladderDelta);

          await tx.playerClassStats.upsert({
            where: { playerId_carClass: { playerId: player.id, carClass: entry.carClass } },
            update: {
              classXp:      { increment: entry.xpGained },
              ladderPoints: newLadderPoints,
            },
            create: {
              playerId:     player.id,
              carClass:     entry.carClass,
              classXp:      currentClassXp + entry.xpGained,
              ladderPoints: Math.max(0, entry.ladderDelta),
            },
          });
        }

        if (player.teamId) {
          await tx.team.update({
            where: { id: player.teamId },
            data: { xp: { increment: entry.xpGained } },
          });
        }
      }
    });

    // ── Discord notification ──────────────────────────────────────────────────
    const top3 = enriched
      .filter((e) => e.foundInDb)
      .sort((a, b) => a.position - b.position)
      .slice(0, 3);

    const biggestXpGain = [...enriched]
      .filter((e) => e.foundInDb)
      .sort((a, b) => b.xpGained - a.xpGained)[0] ?? top3[0];

    const summary: RaceResultSummary = {
      durationMin,
      totalPlayers: calculated.length,
      updatedPlayers,
      top3,
      biggestXpGain,
    };

    sendRaceResultsNotification(summary).catch((err) =>
      console.error("[results] Webhook notification failed:", err)
    );

    return NextResponse.json({
      ok: true,
      updatedPlayers,
      totalPlayers: calculated.length,
      skipped: calculated.length - updatedPlayers,
      autoCreated,
    });
  } catch (err) {
    console.error("[process] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
