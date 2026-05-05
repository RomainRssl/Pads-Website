interface RaceResult {
  position: number;
  username: string;
  carClass?: string;
  laps?: number;
  bestLapTime?: string;
  incidents?: number;
  finishStatus?: string;
  isClean?: boolean;
}

interface RaceResultsTableProps {
  results: RaceResult[];
}

export default function RaceResultsTable({ results }: RaceResultsTableProps) {
  // Parse results if it's a string
  const parsedResults = typeof results === 'string' ? JSON.parse(results) : results;

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
      <table className="w-full text-sm whitespace-nowrap">
        <thead>
          <tr className="border-b border-brand-border">
            <th className="px-4 py-2 text-left text-brand-muted font-semibold">Position</th>
            <th className="px-4 py-2 text-left text-brand-muted font-semibold">Pilote</th>
            {parsedResults[0]?.carClass && (
              <th className="px-4 py-2 text-left text-brand-muted font-semibold">Classe</th>
            )}
            {parsedResults[0]?.laps && (
              <th className="px-4 py-2 text-left text-brand-muted font-semibold">Tours</th>
            )}
            {parsedResults[0]?.bestLapTime && (
              <th className="px-4 py-2 text-left text-brand-muted font-semibold">Meilleur tour</th>
            )}
            {parsedResults[0]?.incidents !== undefined && (
              <th className="px-4 py-2 text-left text-brand-muted font-semibold">Incidents</th>
            )}
            {parsedResults[0]?.finishStatus && (
              <th className="px-4 py-2 text-left text-brand-muted font-semibold">Statut</th>
            )}
            {parsedResults[0]?.isClean !== undefined && (
              <th className="px-4 py-2 text-left text-brand-muted font-semibold">Course Propre</th>
            )}
          </tr>
        </thead>
        <tbody>
          {parsedResults.map((result: RaceResult, idx: number) => (
            <tr key={idx} className="border-b border-brand-border/50 hover:bg-brand-bg transition-colors">
              <td className="px-4 py-3 font-semibold text-brand-red w-12">
                {result.position}
              </td>
              <td className="px-4 py-3 text-brand-text font-medium">
                {result.username}
              </td>
              {parsedResults[0]?.carClass && (
                <td className="px-4 py-3 text-brand-muted text-xs">
                  {result.carClass || '—'}
                </td>
              )}
              {parsedResults[0]?.laps && (
                <td className="px-4 py-3 text-brand-muted">
                  {result.laps || '—'}
                </td>
              )}
              {parsedResults[0]?.bestLapTime && (
                <td className="px-4 py-3 text-brand-muted text-xs font-mono">
                  {result.bestLapTime || '—'}
                </td>
              )}
              {parsedResults[0]?.incidents !== undefined && (
                <td className="px-4 py-3 text-brand-muted">
                  {result.incidents !== undefined ? result.incidents : '—'}
                </td>
              )}
              {parsedResults[0]?.finishStatus && (
                <td className="px-4 py-3 text-xs">
                  <span
                    className={`px-2 py-1 rounded-full font-medium ${
                      result.finishStatus === 'Running' || result.finishStatus === 'Finished'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-orange-500/20 text-orange-400'
                    }`}
                  >
                    {result.finishStatus || '—'}
                  </span>
                </td>
              )}
              {parsedResults[0]?.isClean !== undefined && (
                <td className="px-4 py-3">
                  {result.isClean ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-medium">
                      ✓ Oui
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 font-medium">
                      ✗ Non
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
