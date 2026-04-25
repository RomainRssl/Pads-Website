import { prisma } from "@/lib/prisma";
import { computeLicense, DEFAULT_LICENSES } from "@/lib/license";
import { formatPilotName } from "@/lib/format";
import Link from "next/link";

export const metadata = { title: "Classement — Par amour du spin" };

export default async function ClassementPage() {
  const [players, licenseConfigs] = await Promise.all([
    prisma.player.findMany({
      orderBy: { xp: "desc" },
      include: { team: { select: { name: true } } },
    }),
    prisma.licenseConfig.findMany({ orderBy: { order: "asc" } }),
  ]);

  const configs = licenseConfigs.length > 0 ? licenseConfigs : DEFAULT_LICENSES;

  const standings = players.map((player, idx) => {
    const lic = computeLicense(player.xp, configs);
    const cleanRate =
      player.finishedRaces > 0
        ? Math.round((player.cleanRaces / player.finishedRaces) * 100)
        : 0;
    return { ...player, pos: idx + 1, lic, cleanRate };
  });

  const leader = standings[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🏆</span>
          <h1 className="font-heading text-4xl font-bold text-white tracking-wide">
            Classement <span className="text-brand-red">Pilotes</span>
          </h1>
        </div>
        <p className="text-brand-muted">
          Saison en cours · {players.length} pilote{players.length !== 1 ? "s" : ""} — classement par XP
        </p>
      </div>

      {/* Podium top 3 */}
      {standings.length >= 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[standings[1], standings[0], standings[2]].map((p, i) => {
            if (!p) return <div key={i} />;
            const podiumPos = i === 0 ? 2 : i === 1 ? 1 : 3;
            const medal = podiumPos === 1 ? "🥇" : podiumPos === 2 ? "🥈" : "🥉";
            const glow =
              podiumPos === 1
                ? "border-yellow-400/40 shadow-yellow-400/10"
                : podiumPos === 2
                ? "border-slate-400/40 shadow-slate-400/10"
                : "border-amber-700/40 shadow-amber-700/10";
            const height =
              podiumPos === 1 ? "pt-6" : podiumPos === 2 ? "pt-2" : "pt-4";

            return (
              <Link
                key={p.id}
                href={`/pilotes/${encodeURIComponent(p.username)}`}
                className={`group bg-brand-surface border ${glow} rounded-xl p-5 shadow-lg hover:scale-[1.02] transition-transform text-center ${height}`}
              >
                <div className="text-4xl mb-2">{medal}</div>
                <div className="w-12 h-12 rounded-full bg-brand-dark border border-brand-border flex items-center justify-center text-white font-bold font-heading text-xl mx-auto mb-3">
                  {p.username[0].toUpperCase()}
                </div>
                <p className="font-heading font-bold text-white text-lg group-hover:text-brand-red transition-colors truncate">
                  {formatPilotName(p.username).toUpperCase()}
                </p>
                <p className="text-xs text-brand-muted mb-3 truncate">
                  {p.team?.name ?? "Sans écurie"}
                </p>
                <p className="font-heading text-2xl font-bold text-brand-red">
                  {p.xp.toLocaleString("fr-FR")}
                  <span className="text-sm text-brand-muted font-normal ml-1">XP</span>
                </p>
                {p.lic && (
                  <span
                    className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      color: p.lic.current.color,
                      border: `1px solid ${p.lic.current.color}40`,
                      background: `${p.lic.current.color}15`,
                    }}
                  >
                    {p.lic.current.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {/* Full standings table */}
      <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[3rem_1fr_6rem_7rem_5rem_5rem_5rem] gap-0 border-b border-brand-border bg-brand-dark px-4 py-3 text-xs font-semibold text-brand-muted uppercase tracking-wider">
          <div className="text-center">Pos</div>
          <div>Pilote</div>
          <div className="text-center hidden sm:block">Licence</div>
          <div className="text-right">XP</div>
          <div className="text-right hidden sm:block">Réput.</div>
          <div className="text-right hidden sm:block">Clean</div>
          <div className="text-right hidden sm:block">Courses</div>
        </div>

        {standings.length === 0 ? (
          <div className="text-center py-16 text-brand-muted">
            <p className="text-4xl mb-3">🏎️</p>
            <p>Aucun pilote inscrit pour le moment.</p>
          </div>
        ) : (
          standings.map((p, idx) => {
            const isLeader = idx === 0;
            const gap =
              leader && !isLeader
                ? `+${(leader.xp - p.xp).toLocaleString("fr-FR")}`
                : null;

            const posColor =
              p.pos === 1
                ? "text-yellow-400"
                : p.pos === 2
                ? "text-slate-300"
                : p.pos === 3
                ? "text-amber-600"
                : "text-brand-muted";

            return (
              <Link
                key={p.id}
                href={`/pilotes/${encodeURIComponent(p.username)}`}
                className={`grid grid-cols-[3rem_1fr_6rem_7rem_5rem_5rem_5rem] gap-0 px-4 py-3 border-b border-brand-border/50 last:border-0 hover:bg-brand-dark/60 transition-colors items-center ${
                  isLeader ? "bg-brand-red/5" : ""
                }`}
              >
                {/* Position */}
                <div className={`text-center font-heading font-bold text-lg ${posColor}`}>
                  {p.pos === 1 ? "🥇" : p.pos === 2 ? "🥈" : p.pos === 3 ? "🥉" : p.pos}
                </div>

                {/* Pilote */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 shrink-0 rounded-full bg-brand-dark border border-brand-border flex items-center justify-center text-white font-bold text-sm font-heading">
                    {p.username[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-white text-sm truncate hover:text-brand-red transition-colors">
                      {formatPilotName(p.username).toUpperCase()}
                    </p>
                    <p className="text-xs text-brand-muted truncate">
                      {p.team?.name ?? "Sans écurie"}
                    </p>
                  </div>
                </div>

                {/* Licence */}
                <div className="text-center hidden sm:block">
                  {p.lic && (
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        color: p.lic.current.color,
                        border: `1px solid ${p.lic.current.color}40`,
                        background: `${p.lic.current.color}15`,
                      }}
                    >
                      {p.lic.current.label}
                    </span>
                  )}
                </div>

                {/* XP */}
                <div className="text-right">
                  <p className="font-heading font-bold text-brand-red text-base">
                    {p.xp.toLocaleString("fr-FR")}
                  </p>
                  {gap && (
                    <p className="text-xs text-brand-muted">{gap}</p>
                  )}
                </div>

                {/* Réputation */}
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-white">{p.reputation}</p>
                  <p className="text-xs text-brand-muted">/ 100</p>
                </div>

                {/* Clean % */}
                <div className="text-right hidden sm:block">
                  <p
                    className={`text-sm font-semibold ${
                      p.cleanRate >= 80
                        ? "text-green-400"
                        : p.cleanRate >= 50
                        ? "text-yellow-400"
                        : "text-red-400"
                    }`}
                  >
                    {p.cleanRate}%
                  </p>
                </div>

                {/* Courses */}
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-white">{p.finishedRaces}</p>
                  <p className="text-xs text-brand-muted">courses</p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-brand-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400" /> Clean ≥ 80%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-yellow-400" /> Clean 50–79%
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400" /> Clean &lt; 50%
        </span>
        <span className="ml-auto">XP = Points de la saison</span>
      </div>
    </div>
  );
}
