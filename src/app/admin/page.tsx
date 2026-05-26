import { prisma } from "@/lib/prisma";
import EventTable from "@/components/admin/EventTable";

export default async function AdminPage() {
  const [events, players, sessionRows, historyRows] = await Promise.all([
    prisma.event.findMany({ orderBy: { date: "asc" } }),
    prisma.player.count(),
    // Courses "Carrière" (RaceSession)
    prisma.raceSession.groupBy({
      by: ["trackVenue"],
      _count: { id: true },
    }),
    // Courses "Autres" (RaceHistory)
    prisma.raceHistory.groupBy({
      by: ["track"],
      _count: { id: true },
    }),
  ]);

  // Fusionner les deux sources par nom de circuit
  const circuitMap = new Map<string, number>();
  for (const row of sessionRows) {
    const name = row.trackVenue ?? "Circuit inconnu";
    circuitMap.set(name, (circuitMap.get(name) ?? 0) + row._count.id);
  }
  for (const row of historyRows) {
    const name = row.track ?? "Circuit inconnu";
    circuitMap.set(name, (circuitMap.get(name) ?? 0) + row._count.id);
  }
  const circuitStats = Array.from(circuitMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const totalCourses = circuitStats.reduce((s, r) => s + r.count, 0);
  const sessions = sessionRows.reduce((s, r) => s + r._count.id, 0);

  return (
    <div className="space-y-8">
      <div>
        <div className="section-header"><div className="section-bar"/><h1 className="section-title">Dashboard</h1></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Événements", value: events.length },
            { label: "Pilotes",    value: players },
            { label: "Sessions",   value: sessions },
            { label: "À venir",    value: events.filter(e => new Date(e.date) > new Date()).length },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <span className="stat-value text-brand-orange">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Courses par circuit */}
      {circuitStats.length > 0 && (
        <div>
          <div className="section-header"><div className="section-bar"/><h2 className="section-title">Courses par circuit</h2></div>
          <div className="bg-brand-surface border border-brand-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-dark text-brand-muted text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Circuit</th>
                  <th className="px-4 py-3 text-right">Courses</th>
                  <th className="px-4 py-3 text-right w-48">Répartition</th>
                </tr>
              </thead>
              <tbody>
                {circuitStats.map((row) => {
                  const pct = totalCourses > 0 ? Math.round((row.count / totalCourses) * 100) : 0;
                  return (
                    <tr key={row.name} className="border-b border-brand-border/50 last:border-0 hover:bg-brand-dark/40 transition-colors">
                      <td className="px-4 py-3 font-medium text-brand-text">{row.name}</td>
                      <td className="px-4 py-3 text-right font-heading font-bold text-brand-orange">
                        {row.count}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-28 h-1.5 rounded-full bg-brand-border overflow-hidden">
                            <div className="h-full rounded-full bg-brand-orange" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-brand-muted w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <div className="section-header"><div className="section-bar"/><h2 className="section-title">Tous les événements</h2></div>
        <EventTable initialEvents={events} />
      </div>
    </div>
  );
}
