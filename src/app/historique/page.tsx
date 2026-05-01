import { prisma } from "@/lib/prisma";
import Link from "next/link";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

function sessionLabel(type: string | null) {
  if (type === "Race") return "Course";
  if (type === "Qualification") return "Qualification";
  if (type === "Practice") return "Essais libres";
  return "Session";
}

export default async function HistoriquePage() {
  const sessions = await prisma.raceSession.findMany({
    orderBy: { processedAt: "desc" },
    include: { results: { select: { id: true } } },
  });

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-16">
      <div className="mb-8">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-2">
          Historique des courses
        </h1>
        <p className="text-brand-muted">Résultats de toutes les courses traitées sur la plateforme.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20 border border-brand-border rounded-xl">
          <p className="text-brand-muted text-lg">Aucune course traitée pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-brand-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border bg-brand-surface">
                <th className="text-left px-4 py-3 font-semibold text-brand-muted">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted">Circuit</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted hidden sm:table-cell">Session</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted hidden md:table-cell">Durée</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted">Pilotes</th>
                <th className="text-right px-4 py-3 font-semibold text-brand-muted">Détails</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="border-b border-brand-border last:border-0 hover:bg-brand-surface/50 transition-colors"
                >
                  <td className="px-4 py-3 text-brand-muted whitespace-nowrap">
                    {formatDate(session.processedAt)}
                  </td>
                  <td className="px-4 py-3 text-brand-text font-medium">
                    {session.trackVenue ?? "—"}
                    {session.trackEvent && (
                      <span className="block text-xs text-brand-muted font-normal">{session.trackEvent}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-brand-surface border border-brand-border text-brand-muted">
                      {sessionLabel(session.sessionType)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-muted hidden md:table-cell">
                    {session.durationMin} min
                  </td>
                  <td className="px-4 py-3 text-brand-text font-semibold">
                    {session.results.length}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/historique/${session.id}`}
                      className="px-3 py-1 rounded-lg text-xs font-medium border border-brand-red/30 text-brand-red hover:bg-brand-red/10 transition-colors"
                    >
                      Voir →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
