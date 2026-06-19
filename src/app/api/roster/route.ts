// ── GET /api/roster ───────────────────────────────────────────────────────────
// Liste des pilotes + leur classement par classe, pour l'app desktop.
// Protégé par bearer DESKTOP_API_SECRET. Source = mêmes données que /classement.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDesktopAuthorized } from "@/lib/desktop-auth";
import { getClassStandings } from "@/lib/race-ingest";

export async function GET(req: Request) {
  if (!isDesktopAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [players, standingsByClass] = await Promise.all([
    prisma.player.findMany({
      orderBy: { username: "asc" },
      select: { id: true, username: true, discordUsername: true, discordId: true },
    }),
    getClassStandings(),
  ]);

  // Index inverse : playerId → [{ classe, rang, palier, points }]
  const perPlayer = new Map<string, { classe: string; rang: number; palier: string; points: number }[]>();
  for (const [carClass, rows] of standingsByClass) {
    for (const row of rows) {
      if (!perPlayer.has(row.playerId)) perPlayer.set(row.playerId, []);
      perPlayer.get(row.playerId)!.push({
        classe: carClass,
        rang: row.rang,
        palier: row.palier,
        points: row.ladderPoints,
      });
    }
  }

  const pilotes = players.map((p) => ({
    id: p.id,
    nom: p.username, // le site ne stocke pas de nom civil distinct → pseudo LMU
    pseudoLMU: p.username,
    pseudoDiscord: p.discordUsername,
    discordId: p.discordId,
    classes: perPlayer.get(p.id) ?? [],
  }));

  return NextResponse.json({ pilotes, generatedAt: new Date().toISOString() });
}
