import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getClassXpTier, tiersFromDb } from "@/lib/class-tiers";
import { formatPilotName } from "@/lib/format";

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {players.map((player, idx) => {
            const tier = getClassXpTier(player.xp, classXpTiers);
            const cleanRate = player.finishedRaces > 0
              ? Math.round((player.cleanRaces / player.finishedRaces) * 100)
              : 0;

            return (
              <Link
                key={player.id}
                href={`/pilotes/${encodeURIComponent(player.username)}`}
                className="group bg-brand-surface border border-brand-border rounded-xl p-5 hover:border-brand-orange/50 hover:bg-brand-surface/80 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-brand-dark border border-brand-border flex items-center justify-center text-white font-bold font-heading text-lg">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-white truncate group-hover:text-brand-orange transition-colors">
                      {formatPilotName(player.username).toUpperCase()}
                    </p>
                    <p className="text-xs text-brand-muted truncate">{player.team?.name ?? "Sans écurie"}</p>
                  </div>
                  <span
                    className="shrink-0 text-xs font-bold px-2 py-0.5 rounded"
                    style={{ color: tier.color, border: `1px solid ${tier.color}40`, background: `${tier.color}15` }}
                  >
                    {tier.name.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-brand-orange font-bold font-heading text-lg">{player.xp.toLocaleString("fr-FR")}</p>
                    <p className="text-brand-muted text-xs">XP</p>
                  </div>
                  <div>
                    <p className="text-white font-bold font-heading text-lg">{player.reputation}</p>
                    <p className="text-brand-muted text-xs">Réputation</p>
                  </div>
                  <div>
                    <p className="text-white font-bold font-heading text-lg">{cleanRate}%</p>
                    <p className="text-brand-muted text-xs">Propre</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
