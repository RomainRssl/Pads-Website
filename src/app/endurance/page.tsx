import { prisma } from "@/lib/prisma";
import { parseCarClasses, ENDURANCE_CAR_CLASS_LABELS, type EnduranceCarClass } from "@/lib/endurance";
import Link from "next/link";

function fmt(d: Date): string {
  return d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
}

export default async function EndurancePage() {
  const endurances = await prisma.endurance.findMany({ orderBy: { startDate: "asc" } });
  const now = new Date();
  const upcoming = endurances.filter((e) => e.endDate >= now);
  const past = endurances.filter((e) => e.endDate < now);

  return (
    <div className="space-y-8">
      <div className="section-header">
        <div className="section-bar" />
        <h1 className="section-title">Disponibilités Endurance</h1>
      </div>
      <p className="text-brand-muted text-sm -mt-4">
        Déclare tes disponibilités, forme un équipage et suis le planning du week-end.
      </p>

      {upcoming.length === 0 ? (
        <p className="text-brand-muted text-sm">Aucune endurance à venir pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {upcoming.map((e) => (
            <div key={e.id} className="bg-brand-surface border border-brand-border rounded-xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-brand-text">{e.title}</p>
                  <p className="text-sm text-brand-muted">{e.track}</p>
                  <p className="text-xs text-brand-muted mt-1">{fmt(e.startDate)} → {fmt(e.endDate)}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {parseCarClasses(e.carClasses).map((c) => (
                      <span key={c} className="px-2 py-0.5 rounded-full bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs">
                        {ENDURANCE_CAR_CLASS_LABELS[c as EnduranceCarClass] ?? c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Link href={`/endurance/${e.id}/disponibilites`} className="px-3 py-2 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs font-medium hover:bg-brand-orange/20 transition-colors">
                    🕒 Mes dispos
                  </Link>
                  <Link href={`/endurance/${e.id}/equipe`} className="px-3 py-2 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text text-xs font-medium transition-colors">
                    👥 Équipages
                  </Link>
                  <Link href={`/endurance/${e.id}/calendrier`} className="px-3 py-2 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text text-xs font-medium transition-colors">
                    📅 Calendrier
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-brand-muted uppercase tracking-widest mb-3">Passées</h2>
          <div className="space-y-2">
            {past.map((e) => (
              <div key={e.id} className="bg-brand-surface/50 border border-brand-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-brand-text">{e.title}</p>
                  <p className="text-xs text-brand-muted">{e.track} · {fmt(e.startDate)}</p>
                </div>
                <Link href={`/endurance/${e.id}/calendrier`} className="text-xs text-brand-muted hover:text-brand-text transition-colors">
                  Voir le calendrier →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
