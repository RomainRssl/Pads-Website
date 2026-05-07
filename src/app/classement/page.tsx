import { prisma } from "@/lib/prisma";
import { formatPilotName } from "@/lib/format";
import { getClassXpTier, getLadderTier, CAR_CLASSES, tiersFromDb } from "@/lib/class-tiers";
import type { CarClass } from "@/lib/class-tiers";
import Link from "next/link";

export const metadata = { title: "Classement — Par amour du spin" };

export default async function ClassementPage({
  searchParams,
}: {
  searchParams: Promise<{ classe?: string }>;
}) {
  const { classe: classeRaw } = await searchParams;
  const activeClass = (CAR_CLASSES as readonly string[]).includes(classeRaw ?? "")
    ? (classeRaw as CarClass)
    : CAR_CLASSES[0];

  // Fetch XP tiers from DB
  const licenseConfigs = await prisma.licenseConfig.findMany({ orderBy: { order: "asc" } });
  const classXpTiers = tiersFromDb(licenseConfigs);

  // Fetch all PlayerClassStats for the active class, ordered by ladderPoints desc
  const classStats = await prisma.playerClassStats.findMany({
    where: { carClass: activeClass },
    orderBy: { ladderPoints: "desc" },
    include: {
      player: {
        include: { team: { select: { name: true } } },
      },
    },
  });

  // Check which classes have any data
  const classesWithData = await prisma.playerClassStats.groupBy({
    by: ["carClass"],
    _count: { id: true },
  });
  const classesSet = new Set(classesWithData.map((c) => c.carClass));

  const standings = classStats.map((stat, idx) => {
    const xpTier    = getClassXpTier(stat.classXp, classXpTiers);
    const ladderTier = getLadderTier(stat.ladderPoints);
    const cleanRate =
      stat.player.finishedRaces > 0
        ? Math.round((stat.player.cleanRaces / stat.player.finishedRaces) * 100)
        : 0;
    return {
      pos: idx + 1,
      stat,
      player: stat.player,
      xpTier,
      ladderTier,
      cleanRate,
    };
  });

  const leader = standings[0];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🏆</span>
          <h1 className="font-heading text-4xl font-bold text-white tracking-wide">
            Ladder <span className="text-brand-orange">Pilotes</span>
          </h1>
        </div>
        <p className="text-brand-muted">
          Classement compétitif par classe — Saison en cours
        </p>
      </div>

      {/* Class tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CAR_CLASSES.map((cls) => {
          const hasData = classesSet.has(cls);
          const isActive = cls === activeClass;
          return (
            <Link
              key={cls}
              href={`/classement?classe=${cls}`}
              className={`px-4 py-2 rounded-lg text-sm font-bold font-mono transition-colors border
                ${isActive
                  ? "bg-brand-orange text-white border-brand-orange"
                  : hasData
                  ? "bg-brand-surface border-brand-border text-brand-text hover:border-brand-orange/50 hover:text-white"
                  : "bg-brand-surface border-brand-border/40 text-brand-muted/50 cursor-default"
                }`}
            >
              {cls}
              {hasData && !isActive && (
                <span className="ml-1.5 text-brand-muted font-normal text-xs">
                  {classesWithData.find((c) => c.carClass === cls)?._count.id}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Ladder tier legend */}
      <div className="flex flex-wrap gap-3 mb-6 text-xs">
        {[
          { name: "Bronze",  color: "#CD7F32", range: "< 100 pts" },
          { name: "Silver",  color: "#C0C0C0", range: "100–249 pts" },
          { name: "Gold",    color: "#FFD700", range: "250–399 pts" },
          { name: "Platine", color: "#E5E4E2", range: "≥ 400 pts" },
        ].map((t) => (
          <span key={t.name} className="flex items-center gap-1.5" style={{ color: t.color }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: t.color }} />
            {t.name} <span className="text-brand-muted">{t.range}</span>
          </span>
        ))}
        <span className="ml-auto text-brand-muted">XP de classe : Bronze/Silver/Gold/Platine (0/500/2000/5000)</span>
      </div>

      {standings.length === 0 ? (
        <div className="bg-brand-surface border border-brand-border rounded-xl py-20 text-center">
          <p className="text-4xl mb-3">🏎️</p>
          <p className="text-brand-muted text-lg">Aucune donnée pour la classe {activeClass}.</p>
          <p className="text-brand-muted/60 text-sm mt-1">Importez un résultat XML incluant cette classe.</p>
        </div>
      ) : (
        <>
          {/* Podium top 3 */}
          {standings.length >= 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
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
                const height = podiumPos === 1 ? "pt-6" : podiumPos === 2 ? "pt-2" : "pt-4";

                return (
                  <Link
                    key={p.player.id}
                    href={`/pilotes/${encodeURIComponent(p.player.username)}`}
                    className={`group bg-brand-surface border ${glow} rounded-xl p-5 shadow-lg hover:scale-[1.02] transition-transform text-center ${height}`}
                  >
                    <div className="text-4xl mb-2">{medal}</div>
                    <div className="w-12 h-12 rounded-full bg-brand-dark border border-brand-border flex items-center justify-center text-white font-bold font-heading text-xl mx-auto mb-3">
                      {p.player.username[0].toUpperCase()}
                    </div>
                    <p className="font-heading font-bold text-white text-lg group-hover:text-brand-orange transition-colors truncate">
                      {formatPilotName(p.player.username).toUpperCase()}
                    </p>
                    <p className="text-xs text-brand-muted mb-3 truncate">
                      {p.player.team?.name ?? "Sans écurie"}
                    </p>
                    {/* Ladder points */}
                    <p className="font-heading text-2xl font-bold" style={{ color: p.ladderTier.color }}>
                      {p.stat.ladderPoints.toLocaleString("fr-FR")}
                      <span className="text-sm text-brand-muted font-normal ml-1">pts</span>
                    </p>
                    <span
                      className="inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        color: p.ladderTier.color,
                        border: `1px solid ${p.ladderTier.color}40`,
                        background: `${p.ladderTier.color}15`,
                      }}
                    >
                      {p.ladderTier.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Full standings table */}
          <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden overflow-x-auto">
            <div className="grid grid-cols-[3rem_1fr_6rem_6rem_7rem_5rem_5rem] gap-0 border-b border-brand-border bg-brand-dark px-4 py-3 text-xs font-semibold text-brand-muted uppercase tracking-wider min-w-min">
              <div className="text-center">Pos</div>
              <div className="min-w-[150px]">Pilote</div>
              <div className="text-center hidden sm:block">Rang XP</div>
              <div className="text-center hidden sm:block">Rang Ladder</div>
              <div className="text-right">Ladder pts</div>
              <div className="text-right hidden sm:block">XP classe</div>
              <div className="text-right hidden sm:block">Réput.</div>
            </div>

            {standings.map((p, idx) => {
              const isLeader = idx === 0;
              const gap =
                leader && !isLeader
                  ? `+${(leader.stat.ladderPoints - p.stat.ladderPoints).toLocaleString("fr-FR")}`
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
                  key={p.player.id}
                  href={`/pilotes/${encodeURIComponent(p.player.username)}`}
                  className={`grid grid-cols-[3rem_1fr_6rem_6rem_7rem_5rem_5rem] gap-0 px-4 py-3 border-b border-brand-border/50 last:border-0 hover:bg-brand-dark/60 transition-colors items-center min-w-min ${
                    isLeader ? "bg-brand-orange/5" : ""
                  }`}
                >
                  <div className={`text-center font-heading font-bold text-lg ${posColor}`}>
                    {p.pos === 1 ? "🥇" : p.pos === 2 ? "🥈" : p.pos === 3 ? "🥉" : p.pos}
                  </div>

                  <div className="flex items-center gap-3 min-w-[150px]">
                    <div className="w-8 h-8 shrink-0 rounded-full bg-brand-dark border border-brand-border flex items-center justify-center text-white font-bold text-sm font-heading">
                      {p.player.username[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-heading font-bold text-white text-sm whitespace-nowrap hover:text-brand-orange transition-colors">
                        {formatPilotName(p.player.username).toUpperCase()}
                      </p>
                      <p className="text-xs text-brand-muted truncate">
                        {p.player.team?.name ?? "Sans écurie"}
                      </p>
                    </div>
                  </div>

                  {/* Rang XP de classe */}
                  <div className="text-center hidden sm:block">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        color: p.xpTier.color,
                        border: `1px solid ${p.xpTier.color}40`,
                        background: `${p.xpTier.color}15`,
                      }}
                    >
                      {p.xpTier.name}
                    </span>
                  </div>

                  {/* Rang Ladder */}
                  <div className="text-center hidden sm:block">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded"
                      style={{
                        color: p.ladderTier.color,
                        border: `1px solid ${p.ladderTier.color}40`,
                        background: `${p.ladderTier.color}15`,
                      }}
                    >
                      {p.ladderTier.name}
                    </span>
                  </div>

                  {/* Ladder points */}
                  <div className="text-right">
                    <p className="font-heading font-bold text-brand-orange text-base">
                      {p.stat.ladderPoints.toLocaleString("fr-FR")}
                      <span className="text-brand-muted text-xs font-normal ml-1">pts</span>
                    </p>
                    {gap && <p className="text-xs text-brand-muted">{gap}</p>}
                  </div>

                  {/* XP classe */}
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-white">
                      {p.stat.classXp.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-xs text-brand-muted">XP</p>
                  </div>

                  {/* Réputation */}
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-white">{p.player.reputation}</p>
                    <p className="text-xs text-brand-muted">/ 200</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-brand-muted">
        <span>Score Ladder = ((N+1)/2) − position parmi même rang XP</span>
        <span>·</span>
        <span>Points = Score × coefficient grille</span>
      </div>

      {/* Constructor Championship Section */}
      <ConstructorStandings />
    </div>
  );
}

async function ConstructorStandings() {
  const standings = await prisma.constructorStandings.findMany({
    orderBy: [
      { carClass: "asc" },
      { seasonPoints: "desc" },
    ],
  });

  const constructorClasses = ["GT3", "GTE", "HYPERCAR", "LMGT3"];
  const grouped: Record<string, any[]> = {};
  for (const cls of constructorClasses) {
    grouped[cls] = standings
      .filter((s) => s.carClass === cls)
      .map((s, idx) => ({
        position: idx + 1,
        ...s,
      }));
  }

  const hasData = Object.values(grouped).some((arr) => arr.length > 0);

  if (!hasData) return null;

  return (
    <div className="mt-12 pt-8 border-t border-brand-border">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">🏭</span>
          <h2 className="font-heading text-4xl font-bold text-white tracking-wide">
            Championnat <span className="text-brand-orange">Constructeur</span>
          </h2>
        </div>
        <p className="text-brand-muted">
          Points attribués aux 10 premiers (25-18-15-12-10-8-6-4-2-1)
        </p>
      </div>

      {/* Constructor tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {constructorClasses.map((cls) => {
          const hasConstructors = grouped[cls].length > 0;
          return (
            <div
              key={cls}
              className={`px-4 py-2 rounded-lg text-sm font-bold font-mono transition-colors border
                ${hasConstructors
                  ? "bg-brand-surface border-brand-border text-brand-text"
                  : "bg-brand-surface border-brand-border/40 text-brand-muted/50"
                }`}
            >
              {cls}
              {hasConstructors && (
                <span className="ml-1.5 text-brand-muted font-normal text-xs">
                  {grouped[cls].length}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Constructor standings grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {constructorClasses.map((cls) => {
          const classStandings = grouped[cls];
          if (classStandings.length === 0) return null;

          return (
            <div key={cls} className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
              <div className="bg-brand-dark px-4 py-3 border-b border-brand-border">
                <h3 className="font-heading text-lg font-bold text-white">{cls}</h3>
              </div>
              <div className="divide-y divide-brand-border">
                {classStandings.map((standing) => (
                  <div
                    key={standing.id}
                    className="px-4 py-3 flex items-center justify-between hover:bg-brand-dark/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="text-sm font-heading font-bold w-8 text-center">
                        {standing.position === 1
                          ? "🥇"
                          : standing.position === 2
                          ? "🥈"
                          : standing.position === 3
                          ? "🥉"
                          : standing.position}
                      </div>
                      <span className="font-semibold text-white truncate">
                        {standing.constructorName}
                      </span>
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="font-heading font-bold text-brand-orange text-lg">
                        {standing.seasonPoints}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {standing.raceCount} course{standing.raceCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
