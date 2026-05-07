import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/reset?action=all|players|ladder
export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "all") {
      // Supprime toutes les données de jeu (pas les comptes NextAuth)
      await prisma.$transaction([
        prisma.raceResult.deleteMany(),
        prisma.raceSession.deleteMany(),
        prisma.raceHistory.deleteMany(),
        prisma.playerCategory.deleteMany(),
        prisma.playerClassStats.deleteMany(),
        prisma.constructorStandings.deleteMany(),
        prisma.trackRecord.deleteMany(),
        prisma.player.deleteMany(),
        prisma.team.deleteMany(),
      ]);
      return NextResponse.json({ ok: true, action: "all" });
    }

    if (action === "players") {
      // Remet les stats des pilotes à zéro, supprime résultats et sessions
      await prisma.$transaction([
        prisma.raceResult.deleteMany(),
        prisma.raceSession.deleteMany(),
        prisma.playerClassStats.deleteMany(),
        prisma.constructorStandings.deleteMany(),
        prisma.player.updateMany({
          data: {
            xp: 0,
            money: 0,
            reputation: 50,
            licensePoints: 0,
            totalRaces: 0,
            finishedRaces: 0,
            cleanRaces: 0,
          },
        }),
        prisma.team.updateMany({ data: { xp: 0 } }),
      ]);
      return NextResponse.json({ ok: true, action: "players" });
    }

    if (action === "ladder") {
      // Remet les ladder points à 0 pour tous les joueurs/classes
      await prisma.playerClassStats.updateMany({ data: { ladderPoints: 0 } });
      return NextResponse.json({ ok: true, action: "ladder" });
    }

    return NextResponse.json({ error: "Action invalide." }, { status: 400 });
  } catch (err) {
    console.error("[reset] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne." },
      { status: 500 }
    );
  }
}
