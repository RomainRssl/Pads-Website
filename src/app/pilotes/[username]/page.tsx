import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { computeLicense, DEFAULT_LICENSES } from "@/lib/license";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `${username.toUpperCase()} — Par amour du spin` };
}

export default async function PilotePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;

  const [player, licenseConfigs, allPlayers] = await Promise.all([
    prisma.player.findUnique({
      where: { username },
      include: {
        team: { select: { name: true, xp: true } },
        categories: { include: { category: true } },
      },
    }),
    prisma.licenseConfig.findMany({ orderBy: { order: "asc" } }),
    prisma.player.findMany({ orderBy: { xp: "desc" }, select: { id: true } }),
  ]);

  if (!player) notFound();

  const configs = licenseConfigs.length > 0 ? licenseConfigs : DEFAULT_LICENSES;
  const lic = computeLicense(player.xp, configs);
  const rank = allPlayers.findIndex((p) => p.id === player.id) + 1;
  const cleanRate = player.finishedRaces > 0
    ? Math.round((player.cleanRaces / player.finishedRaces) * 100)
    : 0;
  const categories = player.categories.map((pc) => pc.category);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link href="/pilotes" className="text-brand-muted hover:text-white text-sm mb-8 inline-flex items-center gap-2 transition-colors">
        ← Tous les pilotes
      </Link>

      {/* Main card */}
      <div className="mt-4 bg-brand-surface border border-brand-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="h-2 bg-gradient-to-r from-brand-red via-brand-red/60 to-transparent" />

        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start gap-6">
            {/* Left — identity */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-heading text-3xl font-bold text-white tracking-wide">
                  {player.username.toUpperCase()}
                </h1>
                {rank <= 3 && (
                  <span className="text-2xl">{rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-brand-muted mb-4">
                {player.team && <span className="text-brand-text font-medium">{player.team.name}</span>}
                {player.team && <span>·</span>}
                <span>#{rank} au classement</span>
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

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatBlock label="EXPÉRIENCE" value={player.xp.toLocaleString("fr-FR")} unit="XP" color="text-brand-red" />
                <StatBlock label="ARGENT" value={player.money.toLocaleString("fr-FR")} unit="Crédits" color="text-yellow-400" />
                <StatBlock label="RÉPUTATION" value={`${player.reputation}`} unit="/ 100" color="text-purple-400" />
                <StatBlock label="COURSES TERMINÉES" value={`${player.finishedRaces}`} unit="" color="text-white" />
                <StatBlock label="COURSES CLEAN" value={`${player.cleanRaces}`} unit={`(${cleanRate}%)`} color="text-green-400" />
                {player.team && (
                  <StatBlock label="XP ÉCURIE" value={player.team.xp.toLocaleString("fr-FR")} unit="XP" color="text-blue-400" />
                )}
              </div>
            </div>

            {/* Right — license */}
            {lic && (
              <div className="sm:w-52 bg-brand-dark rounded-xl border border-brand-border p-5 shrink-0">
                <p className="text-brand-muted text-xs font-semibold uppercase tracking-wider mb-3">Progression</p>

                <div className="mb-4">
                  <p className="text-xs text-brand-muted mb-1">LICENCE ACTUELLE</p>
                  <p
                    className="font-heading text-2xl font-bold"
                    style={{ color: lic.current.color }}
                  >
                    {lic.current.label}
                  </p>
                </div>

                {lic.next && (
                  <>
                    <div className="mb-3">
                      <p className="text-xs text-brand-muted mb-1">PROCHAINE ÉTAPE</p>
                      <p className="text-sm text-white font-semibold">Licence {lic.next.label}</p>
                      <p className="text-xs text-brand-muted mt-0.5">
                        {(lic.next.minXp - player.xp).toLocaleString("fr-FR")} XP restants
                      </p>
                    </div>

                    <div className="w-full bg-brand-border rounded-full h-2 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${lic.progress}%`, backgroundColor: lic.current.color }}
                      />
                    </div>
                    <p className="text-xs text-brand-muted mt-1 text-right">{lic.progress}%</p>
                  </>
                )}

                {!lic.next && (
                  <p className="text-xs text-brand-muted mt-2">Licence maximale atteinte 🏆</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBlock({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div className="bg-brand-dark rounded-xl p-3 border border-brand-border">
      <p className="text-brand-muted text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-heading text-xl font-bold ${color}`}>{value} <span className="text-brand-muted text-sm font-normal">{unit}</span></p>
    </div>
  );
}
