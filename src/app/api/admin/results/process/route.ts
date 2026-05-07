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
    const eventId = formData.get("eventId") as string | null;

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

    // Build extended entries (with per-pilot incident type counts from admin preview)
    const extendedEntries: ExtendedRawEntry[] = parsed.entries.map((e, idx) => {
      const u = e.username;
      const getCount = (key: string) => {
        const v = parseInt(formData.get(`${key}_${u}`) as string ?? "", 10);
        return isNaN(v) ? undefined : v;
      };
      return {
        ...e,
        carClass:     parsed.extended[idx]?.carClass,
        finishStatus: parsed.extended[idx]?.finishStatus,
        offtrackCount:  getCount("offtrack"),
        contactCount:   getCount("contact"),
        avertCount:     getCount("avert"),
        sanctionCount:  getCount("sanction"),
      };
    });

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

    // Fetch event track info for track records before transaction (optional)
    const eventData = eventId ? await prisma.event.findUnique({
      where: { id: eventId },
      select: { track: true },
    }) : null;
    // Fall back to XML metadata for circuit name
    const circuitName = eventData?.track ?? parsed.meta.trackVenue ?? null;

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
        const extEnt = extendedEntries.find(x => x.username.toLowerCase() === entry.username.toLowerCase());

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
            offtrackCount: extEnt?.offtrackCount ?? null,
            contactCount:  extEnt?.contactCount  ?? null,
            avertCount:    extEnt?.avertCount     ?? null,
            sanctionCount: extEnt?.sanctionCount  ?? null,
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

      // ── Constructor Championship Points (GT3, GTE, HYPERCAR only) ───────────
      const constructorClasses = ["GT3", "GTE", "HYPERCAR", "LMGT3"];
      for (const carClass of constructorClasses) {
        const classEntries = parsed.extended
          .filter((e) => e.carClass === carClass && e.constructor)
          .sort((a, b) => a.position - b.position)
          .slice(0, 10);

        const points = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];
        for (const [idx, entry] of classEntries.entries()) {
          const constructorName = entry["constructor" as keyof typeof entry] as string | undefined;
          if (constructorName) {
            await tx.constructorStandings.upsert({
              where: {
                carClass_constructorName: {
                  carClass,
                  constructorName,
                },
              },
              update: {
                seasonPoints: { increment: points[idx] ?? 0 },
                raceCount: { increment: 1 },
                updatedAt: new Date(),
              },
              create: {
                carClass,
                constructorName,
                seasonPoints: points[idx] ?? 0,
                raceCount: 1,
              },
            });
          }
        }
      }

      // ── Track Records (all classes with valid best lap time) ───────────────
      if (circuitName) {
        for (const entry of parsed.extended) {
          const constructorName = entry["constructor" as keyof typeof entry] as string | undefined;
          if (entry.carClass && entry.bestLapTimeSec && entry.bestLapTimeSec > 0 && constructorName) {
            const existing = await tx.trackRecord.findUnique({
              where: {
                carClass_circuit: {
                  carClass: entry.carClass,
                  circuit: circuitName,
                },
              },
            });

            if (!existing || entry.bestLapTimeSec < existing.bestLapTime) {
              await tx.trackRecord.upsert({
                where: {
                  carClass_circuit: {
                    carClass: entry.carClass,
                    circuit: circuitName,
                  },
                },
                update: {
                  constructorName,
                  piloteName: entry.username,
                  bestLapTime: entry.bestLapTimeSec,
                  raceDate: new Date(),
                },
                create: {
                  carClass: entry.carClass,
                  circuit: circuitName,
                  constructorName,
                  piloteName: entry.username,
                  bestLapTime: entry.bestLapTimeSec,
                  raceDate: new Date(),
                },
              });
            }
          }
        }
      }

      // ── Create RaceHistory entry ──────────────────────────────────────────
      const event = eventId ? await tx.event.findUnique({
        where: { id: eventId },
        select: { title: true, date: true, track: true },
      }) : null;

      {
        const historyTitle = event?.title ?? parsed.meta.trackVenue ?? "Course";
        const historyTrack = event?.track ?? parsed.meta.trackVenue ?? circuitName ?? "Circuit inconnu";
        const historyDate  = event?.date ?? (parsed.meta.dateString ? new Date(parsed.meta.dateString.replace(/\//g, "-")) : new Date());
        const rawResultsJson = JSON.stringify(
          enriched.map((e, idx) => {
            const extEntry = parsed.extended[idx];
            const constructorName = extEntry?.["constructor" as keyof typeof extEntry] as string | undefined;
            return {
              position: e.position,
              username: e.username,
              carClass: e.carClass,
              carNumber: extEntry?.carNumber,
              teamName: extEntry?.teamName,
              laps: extEntry?.laps,
              bestLapTime: extEntry?.bestLapTimeSec,
              incidents: e.incidents,
              finishStatus: extEntry?.finishStatus,
              constructor: constructorName,
              isClean: e.isClean,
            };
          })
        );
        await tx.raceHistory.create({
          data: {
            ...(eventId ? { event: { connect: { id: eventId } } } : {}),
            title: historyTitle,
            date: historyDate,
            track: historyTrack,
            rawResults: rawResultsJson,
            createdBy: session.user.discordId ?? session.user.id,
          },
        });
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
