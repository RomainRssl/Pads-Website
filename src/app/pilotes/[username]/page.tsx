import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { formatPilotName } from "@/lib/format";
import { getClassXpTier, getLadderTier, getNextClassXpTier, getClassXpProgress } from "@/lib/class-tiers";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);
  return { title: `${username.toUpperCase()} — Par amour du spin` };
}

export default async function PilotePage({ params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = await params;
  const username = decodeURIComponent(rawUsername);

  const [player, allPlayerIds] = await Promise.all([
    prisma.player.findUnique({
      where: { username },
      include: {
        team: { select: { name: true, xp: true } },
        categories: { include: { category: true } },
        classStats: { orderBy: { classXp: "desc" } },
      },
    }),
    // Global rank based on sum of all XP (player.xp)
    prisma.player.findMany({ orderBy: { xp: "desc" }, select: { id: true } }),
  ]);

  if (!player) notFound();

  const rank = allPlayerIds.findIndex((p) => p.id === player.id) + 1;
  const cleanRate = player.finishedRaces > 0
    ? Math.round((player.cleanRaces / player.finishedRaces) * 100)
    : 0;
  const categories = player.categories.map((pc) => pc.category);

  // Compute per-class tiers
  const classStatsWithTiers = player.classStats.map((stat) => ({
    ...stat,
    xpTier:     getClassXpTier(stat.classXp),
    ladderTier: getLadderTier(stat.ladderPoints),
    nextTier:   getNextClassXpTier(stat.classXp),
    xpProgress: getClassXpProgress(stat.classXp),
  }));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/pilotes" className="text-brand-muted hover:text-white text-sm mb-8 inline-flex items-center gap-2 transition-colors">
        ← Tous les pilotes
      </Link>

      {/* Main card */}
      <div className="mt-4 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-brand-red via-brand-red/60 to-transparent" />

        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6">
            {/* Identity + global stats */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-heading text-3xl font-bold text-white tracking-wide">
                  {formatPilotName(player.username).toUpperCase()}
                </h1>
                {rank <= 3 && (
                  <span className="text-2xl">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-brand-muted mb-4">
                {player.team && <span className="text-brand-text font-medium">{player.team.name}</span>}
                {player.team && <span>·</span>}
                <span>#{rank} au classement global</span>
              </div>

              {/* Categories */}
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {categories.map((cat) => (
                    <span key={cat.id} className="px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-red/10 border border-brand-red/30 text-brand-red">
                      {cat.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Global stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatBlock label="ARGENT" value={player.money.toLocaleString("fr-FR")} unit="Crédits" color="text-yellow-400" />
                <StatBlock
                  label="RÉPUTATION"
                  value={`${player.reputation}`}
                  unit="/ 200"
                  color={
                    player.reputation >= 80 ? "text-green-400"
                    : player.reputation >= 40 ? "text-yellow-400"
                    : "text-red-400"
                  }
                />
                <StatBlock label="COURSES TERMINÉES" value={`${player.finishedRaces}`} unit={`dont ${player.cleanRaces} clean (${cleanRate}%)`} color="text-white" />
                {player.team && (
                  <StatBlock label="XP ÉCURIE" value={player.team.xp.toLocaleString("fr-FR")} unit="XP" color="text-blue-400" />
                )}
              </div>
            </div>

            {/* Per-class progression */}
            {classStatsWithTiers.length > 0 && (
              <div>
                <h2 className="font-heading text-lg font-bold text-white mb-4">
                  Progression par classe
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classStatsWithTiers.map((stat) => (
                    <div
                      key={stat.carClass}
                      className="bg-brand-dark border border-brand-border rounded-xl p-4"
                    >
                      {/* Class name */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono font-bold text-sm text-white px-2 py-0.5 rounded bg-brand-surface border border-brand-border">
                          {stat.carClass}
                        </span>
                        {/* Ladder tier badge */}
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded"
                          style={{
                            color: stat.ladderTier.color,
                            border: `1px solid ${stat.ladderTier.color}40`,
                            background: `${stat.ladderTier.color}15`,
                          }}
                        >
                          Ladder {stat.ladderTier.name}
                        </span>
                      </div>

                      {/* XP de classe */}
                      <div className="mb-3">
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-xs text-brand-muted uppercase tracking-wide font-semibold">XP Classe</span>
                          <span
                            className="text-xs font-bold"
                            style={{ color: stat.xpTier.color }}
                          >
                            {stat.xpTier.name}
                          </span>
                        </div>
                        <p className="font-heading text-xl font-bold" style={{ color: stat.xpTier.color }}>
                          {stat.classXp.toLocaleString("fr-FR")}
                          <span className="text-brand-muted text-sm font-normal ml-1">XP</span>
                        </p>
                        {/* Progress bar toward next XP tier */}
                        {stat.nextTier && (
                          <div className="mt-2">
                            <div className="w-full bg-brand-border rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-1.5 rounded-full transition-all"
                                style={{
                                  width: `${stat.xpProgress}%`,
                                  backgroundColor: stat.xpTier.color,
                                }}
                              />
                            </div>
                            <p className="text-xs text-brand-muted mt-1">
                              {(stat.nextTier.min - stat.classXp).toLocaleString("fr-FR")} XP → {stat.nextTier.name}
                            </p>
                          </div>
                        )}
                        {!stat.nextTier && (
                          <p className="text-xs text-brand-muted mt-1">🏆 Rang maximum</p>
                        )}
                      </div>

                      {/* Ladder points */}
                      <div className="pt-3 border-t border-brand-border">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-brand-muted uppercase tracking-wide font-semibold">Ladder</span>
                          <span className="font-heading font-bold text-lg text-white">
                            {stat.ladderPoints.toLocaleString("fr-FR")}
                            <span className="text-brand-muted text-xs font-normal ml-1">pts</span>
                          </span>
                        </div>
                        {/* Ladder progress */}
                        <div className="mt-2">
                          {(() => {
                            const nextLadder = [
                              { name: "Silver",  min: 100 },
                              { name: "Gold",    min: 250 },
                              { name: "Platine", min: 400 },
                            ].find((t) => stat.ladderPoints < t.min);
                            if (!nextLadder) return <p className="text-xs text-brand-muted">🏆 Rang maximum</p>;
                            const current = [
                              { name: "Bronze", min: 0 },
                              { name: "Silver", min: 100 },
                              { name: "Gold",   min: 250 },
                            ].reverse().find((t) => stat.ladderPoints >= t.min)!;
                            const progress = Math.round(
                              ((stat.ladderPoints - current.min) / (nextLadder.min - current.min)) * 100
                            );
                            return (
                              <>
                                <div className="w-full bg-brand-border rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="h-1.5 rounded-full transition-all"
                                    style={{
                                      width: `${progress}%`,
                                      backgroundColor: stat.ladderTier.color,
                                    }}
                                  />
                                </div>
                                <p className="text-xs text-brand-muted mt-1">
                                  {nextLadder.min - stat.ladderPoints} pts → {nextLadder.name}
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {classStatsWithTiers.length === 0 && (
              <div className="bg-brand-dark border border-brand-border/50 rounded-xl p-6 text-center text-brand-muted text-sm">
                <p className="text-2xl mb-2">🏎️</p>
                Aucune course enregistrée pour ce pilote.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom links */}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/classement" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-border text-brand-muted text-sm hover:border-brand-text hover:text-brand-text transition-colors">
          🏆 Classement Ladder
        </Link>
        <Link href="/pilotes" className="flex items-center gap-2 px-4 py-2 rounded-lg border border-brand-border text-brand-muted text-sm hover:border-brand-text hover:text-brand-text transition-colors">
          ← Tous les pilotes
        </Link>
      </div>
    </div>
  );
}

function StatBlock({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-brand-dark rounded-xl p-3 border border-brand-border">
      <p className="text-brand-muted text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-heading text-xl font-bold ${color}`}>
        {value} <span className="text-brand-muted text-sm font-normal">{unit}</span>
      </p>
    </div>
  );
}
