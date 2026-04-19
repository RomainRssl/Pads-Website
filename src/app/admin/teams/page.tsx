import { prisma } from "@/lib/prisma";
import TeamManager from "@/components/admin/TeamManager";

export const metadata = { title: "Écuries — Admin" };

export default async function TeamsPage() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { players: true } } },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">Écuries</h1>
        <p className="text-brand-muted mt-1">
          Gérez les écuries de la ligue. L'XP des pilotes est automatiquement reversé à leur écurie lors du traitement des résultats.
        </p>
      </div>
      <div className="bg-brand-card border border-brand-border rounded-xl p-6 sm:p-8">
        <TeamManager initialTeams={teams} />
      </div>
    </div>
  );
}
