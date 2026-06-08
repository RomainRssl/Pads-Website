import { prisma } from "@/lib/prisma";
import { getClassXpTier, tiersFromDb } from "@/lib/class-tiers";
import { PilotesClient } from "./PilotesClient";

export const metadata = { title: "Pilotes — Par amour du spin" };

export default async function PilotesPage() {
  const [players, licenseConfigs] = await Promise.all([
    prisma.player.findMany({
      orderBy: { xp: "desc" },
      include: { team: { select: { name: true } }, categories: { include: { category: true } } },
    }),
    prisma.licenseConfig.findMany({ orderBy: { order: "asc" } }),
  ]);
  const classXpTiers = tiersFromDb(licenseConfigs);

  const pilotes = players.map((p) => {
    const tier = getClassXpTier(p.xp, classXpTiers);
    return {
      id: p.id,
      username: p.username,
      xp: p.xp,
      reputation: p.reputation,
      finishedRaces: p.finishedRaces,
      cleanRaces: p.cleanRaces,
      teamName: p.team?.name ?? null,
      tier: { name: tier.name, color: tier.color },
    };
  });

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <h1 className="font-heading text-4xl font-bold text-white mb-2">Pilotes</h1>
        <p className="text-brand-muted">
          {players.length} pilote{players.length !== 1 ? "s" : ""} inscrit{players.length !== 1 ? "s" : ""} dans la ligue
        </p>
      </div>

      {players.length === 0 ? (
        <div className="text-center py-24 text-brand-muted">
          <p className="text-5xl mb-4">🏎️</p>
          <p>Aucun pilote inscrit pour le moment.</p>
        </div>
      ) : (
        <PilotesClient pilotes={pilotes} />
      )}
    </div>
  );
}
