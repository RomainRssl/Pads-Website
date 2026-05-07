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

type SessionResult = {
  id: string;
  position: number;
  carClass: string | null;
  player: { username: string };
  [key: string]: unknown;
};

function podiumByClass(results: SessionResult[]): Map<string, string> {
  const map = new Map<string, string>();
  const byClass = new Map<string, SessionResult[]>();
  for (const r of [...results].sort((a, b) => a.position - b.position)) {
    const cls = r.carClass ?? "__overall__";
    if (!byClass.has(cls)) byClass.set(cls, []);
    byClass.get(cls)!.push(r);
  }
  for (const [, group] of Array.from(byClass.entries())) {
    group.forEach((r, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${r.position}`;
      map.set(`${r.player.username}__${r.carClass}`, medal);
    });
  }
  return map;
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
  const medals        = podiumByClass(session.results as SessionResult[]);

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
      <div className="rounded-xl border border-brand-border overflow-hidden">
        <table className="w-full text-xs table-fixed">
          <colgroup>
            <col className="w-10" />
            <col className="w-36" />
            {hasClass   && <col className="w-20" />}
            {hasLaps    && <col className="w-12" />}
            {hasBestLap && <col className="w-16" />}
            {hasFinish  && <col className="w-12" />}
            {hasIncidentBreakdown && <><col className="w-9" /><col className="w-9" /><col className="w-9" /><col className="w-9" /></>}
            {hasIncidents && !hasIncidentBreakdown && <col className="w-10" />}
            <col className="w-16" />
            <col className="w-20" />
            {hasLadder  && <col className="w-14" />}
            <col className="w-12" />
          </colgroup>
          <thead>
            <tr className="border-b border-brand-border bg-brand-surface">
              <Th center>Pos</Th>
              <Th>Pilote</Th>
              {hasClass    && <Th>Classe</Th>}
              {hasLaps     && <Th center>Tours</Th>}
              {hasBestLap  && <Th>Tps.</Th>}
              {hasFinish   && <Th center>Arr.</Th>}
              {hasIncidentBreakdown && <Th center>Off.</Th>}
              {hasIncidentBreakdown && <Th center>Co.</Th>}
              {hasIncidentBreakdown && <Th center>Av.</Th>}
              {hasIncidentBreakdown && <Th center>Sa.</Th>}
              {hasIncidents && !hasIncidentBreakdown && <Th center>Inc.</Th>}
              <Th center>XP</Th>
              <Th center>Argent</Th>
              {hasLadder   && <Th center>Ldr Δ</Th>}
              <Th center>Rép.</Th>
            </tr>
          </thead>
          <tbody>
            {session.results.map((result) => {
              const isDnf = result.finishStatus && result.finishStatus !== "Finished Normally";

              return (
                <tr key={result.id}
                  className={`border-b border-brand-border last:border-0 hover:bg-brand-surface/50 transition-colors ${isDnf ? "bg-red-500/5" : ""}`}>
                  <td className="px-1 py-2 font-bold text-brand-text text-center">
                    {medals.get(`${result.player.username}__${result.carClass}`) ?? `#${result.position}`}
                  </td>
                  <td className="px-2 py-2 overflow-hidden">
                    <p className="font-medium text-brand-text truncate">{result.player.username}</p>
                    {result.teamName && <p className="text-brand-muted truncate">{result.teamName}</p>}
                  </td>
                  {hasClass && (
                    <td className="px-1 py-2 overflow-hidden">
                      {result.carClass && (
                        <span className="font-mono text-brand-muted truncate block">{result.carClass}</span>
                      )}
                    </td>
                  )}
                  {hasLaps && <td className="px-1 py-2 text-brand-text text-center">{result.laps ?? "—"}</td>}
                  {hasBestLap && <td className="px-1 py-2 font-mono text-brand-text text-center">{formatLapTime(result.bestLapTimeSec)}</td>}
                  {hasFinish && (
                    <td className="px-1 py-2 text-center">
                      {isDnf
                        ? <span className="text-red-400 font-bold">DNF</span>
                        : result.finishStatus
                        ? <span className="text-green-400">✓</span>
                        : null}
                    </td>
                  )}
                  {hasIncidentBreakdown && (
                    <>
                      {(["offtrackCount","contactCount","avertCount","sanctionCount"] as const).map((field) => {
                        const val = (result[field] ?? 0) as number;
                        return (
                          <td key={field} className="px-1 py-2 text-center">
                            {val > 0
                              ? <span className="text-orange-400 font-bold">{val}</span>
                              : <span className="text-brand-muted">0</span>}
                          </td>
                        );
                      })}
                    </>
                  )}
                  {hasIncidents && !hasIncidentBreakdown && (
                    <td className="px-1 py-2 text-center">
                      {result.incidents > 0
                        ? <span className="text-orange-400 font-bold">{result.incidents}</span>
                        : <span className="text-green-400">✓</span>}
                    </td>
                  )}
                  <td className="px-1 py-2 font-semibold text-brand-red text-center">
                    +{result.xpGained.toLocaleString("fr-FR")}
                  </td>
                  <td className="px-1 py-2 text-brand-muted text-center">
                    +{result.moneyGained.toLocaleString("fr-FR")}
                  </td>
                  {hasLadder && (
                    <td className="px-1 py-2 font-mono text-center">
                      {result.ladderDelta > 0
                        ? <span className="text-blue-400 font-bold">+{result.ladderDelta}</span>
                        : result.ladderDelta < 0
                        ? <span className="text-red-400 font-bold">{result.ladderDelta}</span>
                        : <span className="text-brand-muted">0</span>}
                    </td>
                  )}
                  <td className="px-1 py-2 text-center">
                    {result.reputationDelta > 0
                      ? <span className="text-green-400 font-semibold">+{result.reputationDelta}</span>
                      : result.reputationDelta < 0
                      ? <span className="text-red-400 font-semibold">{result.reputationDelta}</span>
                      : <span className="text-brand-muted">0</span>}
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

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <th className={`px-1 py-2 font-semibold text-brand-muted text-xs uppercase tracking-wide truncate ${center ? "text-center" : "text-left"}`}>{children}</th>;
}

function Pill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-brand-muted text-xs">
      <span>{icon}</span><span>{label}</span>
    </div>
  );
}
