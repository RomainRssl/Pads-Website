import { prisma } from "@/lib/prisma";
import PlayerMergeManager from "@/components/admin/PlayerMergeManager";

export const metadata = { title: "Fusion de fiches — Admin" };

export default async function PlayerMergePage() {
  const players = await prisma.player.findMany({
    orderBy: { username: "asc" },
    include: {
      team: { select: { id: true, name: true } },
      classStats: true,
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">Fusion de fiches pilotes</h1>
        <p className="text-brand-muted mt-1">
          Quand un pilote change de pseudo en jeu, une seconde fiche est créée à la course suivante.
          Fusionnez ici le doublon dans la fiche d&apos;origine : courses, XP, argent et points ladder
          sont transférés, puis le doublon est supprimé.
        </p>
      </div>
      <div className="bg-brand-card border border-brand-border rounded-xl p-6 sm:p-8">
        <PlayerMergeManager initialPlayers={players} />
      </div>
    </div>
  );
}
