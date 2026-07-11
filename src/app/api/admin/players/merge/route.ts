import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST /api/admin/players/merge
// Fusionne la fiche `sourceId` (doublon, supprimée) dans la fiche `targetId` (conservée).
// - RaceResults repointés vers la fiche conservée
// - PlayerClassStats additionnés par classe (classXp + ladderPoints)
// - Catégories fusionnées (union)
// - Stats globales additionnées ; réputation = target + (source - 50), bornée 0–100
// - keepUsername: "target" | "source" — pseudo conservé sur la fiche finale

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { targetId, sourceId, keepUsername } = body as {
    targetId?: string;
    sourceId?: string;
    keepUsername?: "target" | "source";
  };

  if (!targetId || !sourceId) {
    return NextResponse.json(
      { error: "Les deux fiches (targetId et sourceId) sont requises." },
      { status: 400 }
    );
  }
  if (targetId === sourceId) {
    return NextResponse.json(
      { error: "Impossible de fusionner une fiche avec elle-même." },
      { status: 400 }
    );
  }

  const [target, source] = await Promise.all([
    prisma.player.findUnique({
      where: { id: targetId },
      include: { classStats: true, categories: true },
    }),
    prisma.player.findUnique({
      where: { id: sourceId },
      include: { classStats: true, categories: true },
    }),
  ]);
  if (!target || !source) {
    return NextResponse.json({ error: "Fiche pilote introuvable." }, { status: 404 });
  }

  const merged = await prisma.$transaction(async (tx) => {
    // Repointer l'historique de courses du doublon vers la fiche conservée
    await tx.raceResult.updateMany({
      where: { playerId: source.id },
      data: { playerId: target.id },
    });

    // Stats par classe : additionner si la classe existe déjà, sinon transférer
    for (const stat of source.classStats) {
      const existing = target.classStats.find((s) => s.carClass === stat.carClass);
      if (existing) {
        await tx.playerClassStats.update({
          where: { id: existing.id },
          data: {
            classXp: existing.classXp + stat.classXp,
            ladderPoints: existing.ladderPoints + stat.ladderPoints,
          },
        });
        await tx.playerClassStats.delete({ where: { id: stat.id } });
      } else {
        await tx.playerClassStats.update({
          where: { id: stat.id },
          data: { playerId: target.id },
        });
      }
    }

    // Catégories : union (celles du doublon sont supprimées en cascade avec lui)
    const targetCatIds = new Set(target.categories.map((c) => c.categoryId));
    for (const cat of source.categories) {
      if (!targetCatIds.has(cat.categoryId)) {
        await tx.playerCategory.create({
          data: { playerId: target.id, categoryId: cat.categoryId },
        });
      }
    }

    // Supprimer le doublon d'abord — libère son username / discordId (uniques)
    await tx.player.delete({ where: { id: source.id } });

    // Les deux fiches partent de 50 : on ajoute à la fiche conservée le delta gagné par le doublon
    const reputation = Math.max(
      0,
      Math.min(100, target.reputation + (source.reputation - 50))
    );

    return tx.player.update({
      where: { id: target.id },
      data: {
        username: keepUsername === "source" ? source.username : target.username,
        discordUsername: target.discordUsername ?? source.discordUsername,
        discordId: target.discordId ?? source.discordId,
        teamId: target.teamId ?? source.teamId,
        xp: target.xp + source.xp,
        money: target.money + source.money,
        licensePoints: target.licensePoints + source.licensePoints,
        totalRaces: target.totalRaces + source.totalRaces,
        finishedRaces: target.finishedRaces + source.finishedRaces,
        cleanRaces: target.cleanRaces + source.cleanRaces,
        reputation,
      },
      include: {
        team: { select: { id: true, name: true } },
        classStats: true,
      },
    });
  });

  return NextResponse.json(merged);
}
