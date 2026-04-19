import { prisma } from "@/lib/prisma";
import PlayerManager from "@/components/admin/PlayerManager";

export const metadata = { title: "Pilotes — Admin" };

export default async function PlayersPage() {
  const [players, teams, categories] = await Promise.all([
    prisma.player.findMany({
      orderBy: { username: "asc" },
      include: {
        team: { select: { id: true, name: true } },
        categories: { include: { category: true } },
      },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { order: "asc" } }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">Pilotes</h1>
        <p className="text-brand-muted mt-1">
          Gérez les profils pilotes. Le pseudo doit correspondre exactement à celui utilisé dans les fichiers de résultats.
        </p>
      </div>
      <div className="bg-brand-card border border-brand-border rounded-xl p-6 sm:p-8">
        <PlayerManager initialPlayers={players} teams={teams} categories={categories} />
      </div>
    </div>
  );
}
