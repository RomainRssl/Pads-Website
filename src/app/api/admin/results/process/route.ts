import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { parseFile } from "@/lib/race-parser";
import { calculateAll } from "@/lib/rewards";
import { prisma } from "@/lib/prisma";
import { sendRaceResultsNotification } from "@/lib/discord-webhook";
import type { RaceResultSummary } from "@/lib/discord-webhook";

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

  const calculated = calculateAll(parsed.entries, durationMin);

  // Fetch all players, filter case-insensitively in JS (SQLite has no ILIKE)
  const lowerUsernames = new Set(calculated.map((e) => e.username.toLowerCase()));
  const allPlayers = await prisma.player.findMany({ include: { team: true } });
  const players = allPlayers.filter((p) => lowerUsernames.has(p.username.toLowerCase()));
  const playerMap = new Map(players.map((p) => [p.username.toLowerCase(), p]));

  // Build the enriched list for webhook summary
  const enriched = calculated.map((entry) => ({
    ...entry,
    foundInDb: playerMap.has(entry.username.toLowerCase()),
  }));

  const toUpdate = enriched.filter((e) => e.foundInDb);
  const updatedPlayers = toUpdate.length;

  // ── Prisma transaction ────────────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // 1. Create the RaceSession
    const raceSession = await tx.raceSession.create({
      data: {
        durationMin,
        processedBy: session.user.discordId ?? session.user.id,
      },
    });

    for (const entry of toUpdate) {
      const player = playerMap.get(entry.username.toLowerCase())!;

      // 2. Update player stats
      await tx.player.update({
        where: { id: player.id },
        data: {
          xp: { increment: entry.xpGained },
          money: { increment: entry.moneyGained },
          finishedRaces: { increment: 1 },
          ...(entry.isClean ? { cleanRaces: { increment: 1 } } : {}),
        },
      });

      // 3. Create RaceResult row
      await tx.raceResult.create({
        data: {
          playerId: player.id,
          raceSessionId: raceSession.id,
          position: entry.position,
          xpGained: entry.xpGained,
          moneyGained: entry.moneyGained,
          isClean: entry.isClean,
        },
      });

      // 4. Propagate XP to the player's team
      if (player.teamId) {
        await tx.team.update({
          where: { id: player.teamId },
          data: { xp: { increment: entry.xpGained } },
        });
      }
    }
  });

  // ── Discord notification (fire-and-forget) ────────────────────────────────
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
  });
  } catch (err) {
    console.error("[process] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
