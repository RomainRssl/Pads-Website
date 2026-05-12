import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const revalidate = 60;

export default async function RaceHistoryPage() {
  const sessions = await prisma.raceSession.findMany({
    include: {
      results: {
        include: { player: true },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { processedAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-brand-navy">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="section-header">
          <div className="section-bar" />
          <h1 className="section-title">Historique des courses</h1>
          <span className="font-heading text-xs text-brand-muted ml-auto">{sessions.length} sessions</span>
        </div>

        {sessions.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="font-heading font-semibold text-sm uppercase tracking-widest text-brand-muted">
              Aucune session enregistrée
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sessions.map(s => {
              const date = new Intl.DateTimeFormat("fr-FR", {
                day: "numeric", month: "long", year: "numeric",
              }).format(new Date(s.processedAt));
              return (
                <div key={s.id} className="card border-l-2 border-l-brand-orange overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border bg-brand-surface/50">
                    <div>
                      {s.trackEvent && <p className="badge-game mb-1">{s.trackEvent}</p>}
                      <h3 className="font-heading font-bold text-base uppercase text-brand-text">
                        {s.trackVenue ?? `Session #${s.id.slice(0, 6)}`}
                      </h3>
                      {s.sessionType && (
                        <p className="font-body text-xs text-brand-muted mt-0.5">{s.sessionType}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-xs text-brand-muted">{date}</p>
                      <p className="font-heading text-xs text-brand-muted mt-1">{s.durationMin} min</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-racing">
                      <thead>
                        <tr>
                          <th className="w-12">Pos.</th>
                          <th>Pilote</th>
                          <th className="text-right">XP gagné</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.results.map(r => (
                          <tr key={r.id}>
                            <td className={`font-heading font-bold ${r.position <= 3 ? "text-brand-orange" : "text-brand-muted"}`}>
                              {r.position <= 3 ? ["🥇", "🥈", "🥉"][r.position - 1] : `#${r.position}`}
                            </td>
                            <td className="font-heading font-bold text-sm uppercase">{r.player.username}</td>
                            <td className="text-right font-heading font-bold text-brand-orange">+{r.xpGained}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
