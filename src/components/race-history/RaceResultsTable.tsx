import { formatPilotName } from "@/lib/format";

interface RaceResult {
  position: number;
  username: string;
  carClass?: string;
  teamName?: string;
  laps?: number;
  bestLapTime?: number | string | null;
  incidents?: number;
  finishStatus?: string;
  isClean?: boolean;
  offtrackCount?: number;
  contactCount?: number;
  avertCount?: number;
  sanctionCount?: number;
  classXpTier?: { name: string; color: string } | null;
}

interface RaceResultsTableProps {
  results: RaceResult[] | string;
}

function formatLapTime(sec: number | string | null | undefined): string {
  if (sec == null || sec === "") return "—";
  const s = typeof sec === "string" ? parseFloat(sec) : sec;
  if (isNaN(s) || s <= 0) return "—";
  const m = Math.floor(s / 60);
  const rest = (s % 60).toFixed(3).padStart(6, "0");
  return `${m}:${rest}`;
}

function podiumByClass(results: RaceResult[]): Map<string, string> {
  const map = new Map<string, string>();
  const byClass = new Map<string, RaceResult[]>();
  for (const r of [...results].sort((a, b) => a.position - b.position)) {
    const cls = r.carClass ?? "__overall__";
    if (!byClass.has(cls)) byClass.set(cls, []);
    byClass.get(cls)!.push(r);
  }
  for (const [, group] of Array.from(byClass.entries())) {
    group.forEach((r, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${r.position}`;
      map.set(`${r.username}__${r.carClass}`, medal);
    });
  }
  return map;
}

export default function RaceResultsTable({ results }: RaceResultsTableProps) {
  const parsedResults: RaceResult[] = typeof results === "string" ? JSON.parse(results) : results;
  const medals = podiumByClass(parsedResults);

  const hasClass    = parsedResults.some((r) => r.carClass);
  const hasClassTier = parsedResults.some((r) => r.classXpTier);
  const hasLaps     = parsedResults.some((r) => r.laps);
  const hasBestLap  = parsedResults.some((r) => r.bestLapTime);
  const hasFinish   = parsedResults.some((r) => r.finishStatus);
  const hasBreakdown = parsedResults.some(
    (r) => (r.offtrackCount ?? 0) + (r.contactCount ?? 0) + (r.avertCount ?? 0) + (r.sanctionCount ?? 0) > 0
  );
  const hasIncidents = parsedResults.some((r) => (r.incidents ?? 0) > 0);

  return (
    <div className="rounded-xl border border-brand-border overflow-hidden">
      <table className="w-full text-xs table-fixed">
        <colgroup>
          <col className="w-10" />
          <col className="w-36" />
          {hasClass   && <col className="w-20" />}
          {hasClassTier && <col className="w-20" />}
          {hasLaps    && <col className="w-12" />}
          {hasBestLap && <col className="w-16" />}
          {hasFinish  && <col className="w-12" />}
          {hasBreakdown && <><col className="w-9" /><col className="w-9" /><col className="w-9" /><col className="w-9" /></>}
          {hasIncidents && !hasBreakdown && <col className="w-10" />}
        </colgroup>
        <thead>
          <tr className="border-b border-brand-border bg-brand-surface">
            <Th center>Pos</Th>
            <Th>Pilote</Th>
            {hasClass   && <Th>Classe</Th>}
            {hasClassTier && <Th center>Cls.</Th>}
            {hasLaps    && <Th center>Trs</Th>}
            {hasBestLap && <Th center>Tps.</Th>}
            {hasFinish  && <Th center>Arr.</Th>}
            {hasBreakdown && <><Th center>Off</Th><Th center>Co</Th><Th center>Av</Th><Th center>Sa</Th></>}
            {hasIncidents && !hasBreakdown && <Th center>Inc.</Th>}
          </tr>
        </thead>
        <tbody>
          {parsedResults.map((result, idx) => {
            const isDnf = result.finishStatus && result.finishStatus !== "Finished Normally" && result.finishStatus !== "Running" && result.finishStatus !== "Finished";
            const medal = medals.get(`${result.username}__${result.carClass}`) ?? `#${result.position}`;
            return (
              <tr key={idx} className={`border-b border-brand-border last:border-0 hover:bg-brand-surface/50 transition-colors ${isDnf ? "bg-red-500/5" : ""}`}>
                <td className="px-1 py-2 font-bold text-brand-text text-center">{medal}</td>
                <td className="px-2 py-2 overflow-hidden">
                  <p className="font-medium text-brand-text truncate">{formatPilotName(result.username)}</p>
                  {result.teamName && <p className="text-brand-muted truncate">{result.teamName}</p>}
                </td>
                {hasClass && (
                  <td className="px-1 py-2 overflow-hidden">
                    <span className="font-mono text-brand-muted truncate block">{result.carClass ?? "—"}</span>
                  </td>
                )}
                {hasClassTier && (
                  <td className="px-1 py-2 text-center">
                    {result.classXpTier ? (
                      <span
                        style={{
                          color: result.classXpTier.color,
                          border: `1px solid ${result.classXpTier.color}40`,
                          background: `${result.classXpTier.color}15`,
                        }}
                        className="text-xs px-1.5 py-0.5 rounded font-semibold"
                      >
                        {result.classXpTier.name}
                      </span>
                    ) : (
                      <span className="text-brand-muted">—</span>
                    )}
                  </td>
                )}
                {hasLaps    && <td className="px-1 py-2 text-brand-text text-center">{result.laps ?? "—"}</td>}
                {hasBestLap && <td className="px-1 py-2 font-mono text-brand-text text-center">{formatLapTime(result.bestLapTime)}</td>}
                {hasFinish  && (
                  <td className="px-1 py-2 text-center">
                    {isDnf ? <span className="text-red-400 font-bold">DNF</span> : <span className="text-green-400">✓</span>}
                  </td>
                )}
                {hasBreakdown && (
                  <>
                    {([["offtrackCount","Off"],["contactCount","Co"],["avertCount","Av"],["sanctionCount","Sa"]] as const).map(([field]) => {
                      const val = (result[field as keyof RaceResult] as number) ?? 0;
                      return (
                        <td key={field} className="px-1 py-2 text-center">
                          {val > 0 ? <span className="text-orange-400 font-bold">{val}</span> : <span className="text-brand-muted">0</span>}
                        </td>
                      );
                    })}
                  </>
                )}
                {hasIncidents && !hasBreakdown && (
                  <td className="px-1 py-2 text-center">
                    {(result.incidents ?? 0) > 0 ? <span className="text-orange-400 font-bold">{result.incidents}</span> : <span className="text-green-400">✓</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <th className={`px-1 py-2 font-semibold text-brand-muted text-xs uppercase tracking-wide truncate ${center ? "text-center" : "text-left"}`}>{children}</th>;
}
