import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

function formatLapTime(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

function sessionLabel(type: string | null) {
  if (type === "Race") return "Course";
  if (type === "Qualification") return "Qualification";
  if (type === "Practice") return "Essais libres";
  return "Session";
}

export default async function HistoriqueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.raceSession.findUnique({
    where: { id },
    include: {
      results: {
        include: { player: { select: { username: true } } },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!session) notFound();

  const hasClass      = session.results.some((r) => r.carClass);
  const hasLaps       = session.results.some((r) => r.laps != null);
  const hasBestLap    = session.results.some((r) => r.bestLapTimeSec != null);
  const hasFinish     = session.results.some((r) => r.finishStatus);
  const hasIncidents  = session.results.some((r) => r.incidents > 0);
  const hasLadder     = session.results.some((r) => r.ladderDelta !== 0);
  const hasIncidentBreakdown = session.results.some(
    (r) => (r.offtrackCount ?? 0) + (r.contactCount ?? 0) + (r.avertCount ?? 0) + (r.sanctionCount ?? 0) > 0
  );
  const classes       = Array.from(new Set(session.results.map((r) => r.carClass).filter(Boolean)));

  return (
    <main className="w-full px-4 sm:px-6 py-16">
      {/* Back link */}
      <Link href="/historique" className="inline-flex items-center gap-2 text-brand-muted hover:text-white text-sm mb-8 transition-colors">
        ← Historique des courses
      </Link>

      {/* Session header */}
      <div className="bg-brand-dark border border-brand-border rounded-xl overflow-hidden mb-8">
        <div className="h-1 bg-gradient-to-r from-brand-red via-brand-red/60 to-transparent" />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-brand-red font-bold text-xs uppercase tracking-wider">
                  {sessionLabel(session.sessionType)}
                </span>
                {classes.map((cls) => (
                  <span key={cls} className="text-xs px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-muted font-mono">{cls}</span>
                ))}
              </div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">
                {session.trackVenue ?? "Circuit inconnu"}
              </h1>
              {session.trackEvent && <p className="text-brand-muted mt-0.5">{session.trackEvent}</p>}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Pill icon="📅" label={formatDate(session.processedAt)} />
              <Pill icon="⏱" label={`${session.durationMin} min`} />
              <Pill icon="🏎️" label={`${session.results.length} pilotes`} />
            </div>
          </div>
        </div>
      </div>

      {/* Results table */}
      <div className="overflow-x-auto rounded-xl border border-brand-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-surface">
              <Th>Pos</Th>
              <Th>Pilote</Th>
              {hasClass    && <Th>Classe</Th>}
              {hasLaps     && <Th>Tours</Th>}
              {hasBestLap  && <Th>Meilleur temps</Th>}
              {hasFinish   && <Th>Arrivée</Th>}
              {hasIncidentBreakdown && <Th>Off.</Th>}
              {hasIncidentBreakdown && <Th>Cont.</Th>}
              {hasIncidentBreakdown && <Th>Avert.</Th>}
              {hasIncidentBreakdown && <Th>Sanct.</Th>}
              {hasIncidents && !hasIncidentBreakdown && <Th>Incidents</Th>}
              <Th>XP</Th>
              <Th>Argent</Th>
              {hasLadder   && <Th>Ladder Δ</Th>}
              <Th>Rép. Δ</Th>
            </tr>
          </thead>
          <tbody>
            {session.results.map((result) => {
              const isDnf = result.finishStatus && result.finishStatus !== "Finished Normally";
              const isSanction = result.incidents >= session.sanctionThreshold;
              const isWarning  = !isSanction && result.incidents >= session.warningThreshold;

              return (
                <tr key={result.id}
                  className={`border-b border-brand-border last:border-0 hover:bg-brand-surface/50 transition-colors ${isDnf ? "bg-red-500/5" : ""}`}>
                  <td className="px-4 py-3 font-bold text-brand-text text-center whitespace-nowrap">
                    {result.position === 1 ? "🥇" : result.position === 2 ? "🥈" : result.position === 3 ? "🥉" : `#${result.position}`}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-brand-text whitespace-nowrap">{result.player.username}</p>
                    {result.teamName && <p className="text-xs text-brand-muted truncate max-w-[180px]">{result.teamName}</p>}
                  </td>
                  {hasClass && (
                    <td className="px-4 py-3">
                      {result.carClass && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-muted">{result.carClass}</span>
                      )}
                    </td>
                  )}
                  {hasLaps && <td className="px-4 py-3 text-brand-text text-center">{result.laps ?? "—"}</td>}
                  {hasBestLap && <td className="px-4 py-3 font-mono text-brand-text whitespace-nowrap">{formatLapTime(result.bestLapTimeSec)}</td>}
                  {hasFinish && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      {isDnf ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold">DNF</span>
                      ) : result.finishStatus ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">Classé</span>
                      ) : null}
                    </td>
                  )}
                  {hasIncidentBreakdown && (
                    <>
                      {(["offtrackCount","contactCount","avertCount","sanctionCount"] as const).map((field) => {
                        const val = (result[field] ?? 0) as number;
                        return (
                          <td key={field} className="px-3 py-3 text-center">
                            {val > 0
                              ? <span className="text-orange-400 font-bold">{val}</span>
                              : <span className="text-brand-muted text-xs">0</span>}
                          </td>
                        );
                      })}
                    </>
                  )}
                  {hasIncidents && !hasIncidentBreakdown && (
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      {result.incidents > 0 ? (
                        <span className="text-orange-400 font-bold">{result.incidents}</span>
                      ) : (
                        <span className="text-green-400 text-xs">✓</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 font-semibold text-brand-red whitespace-nowrap">
                    +{result.xpGained.toLocaleString("fr-FR")} XP
                  </td>
                  <td className="px-4 py-3 text-brand-muted whitespace-nowrap">
                    +{result.moneyGained.toLocaleString("fr-FR")} 💰
                  </td>
                  {hasLadder && (
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-center">
                      {result.ladderDelta > 0 ? (
                        <span className="text-blue-400 font-bold">+{result.ladderDelta}</span>
                      ) : result.ladderDelta < 0 ? (
                        <span className="text-red-400 font-bold">{result.ladderDelta}</span>
                      ) : (
                        <span className="text-brand-muted">0</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {result.reputationDelta > 0 ? (
                      <span className="text-green-400 font-semibold">+{result.reputationDelta}</span>
                    ) : result.reputationDelta < 0 ? (
                      <span className="text-red-400 font-semibold">{result.reputationDelta}</span>
                    ) : (
                      <span className="text-brand-muted">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 font-semibold text-brand-muted whitespace-nowrap text-xs uppercase tracking-wide">{children}</th>;
}

function Pill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-brand-muted text-xs">
      <span>{icon}</span><span>{label}</span>
    </div>
  );
}
