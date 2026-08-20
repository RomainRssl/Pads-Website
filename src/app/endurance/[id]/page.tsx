import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { parseCarClasses, parseStartTimes, ENDURANCE_CAR_CLASS_LABELS, type EnduranceCarClass } from "@/lib/endurance";
import EnduranceSubNav from "@/components/endurance/EnduranceSubNav";

function fmt(d: Date): string {
  return d.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" });
}

export default async function EnduranceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const endurance = await prisma.endurance.findUnique({ where: { id } });
  if (!endurance) notFound();

  const availabilities = await prisma.enduranceAvailability.findMany({
    where: { enduranceId: id },
    include: { user: { select: { name: true, image: true } } },
    orderBy: { startTime: "asc" },
  });

  // Regroupe les pilotes par créneau (heure de début → heure de fin) et par
  // catégorie de voiture, pour répondre en un coup d'œil à "qui roule quand,
  // sur quoi".
  const slotGroups = new Map<
    string,
    { startTime: Date; endTime: Date; carClass: string; entries: typeof availabilities }
  >();
  for (const a of availabilities) {
    const key = `${a.startTime.toISOString()}|${a.endTime.toISOString()}|${a.carClass}`;
    const group = slotGroups.get(key);
    if (group) {
      group.entries.push(a);
    } else {
      slotGroups.set(key, { startTime: a.startTime, endTime: a.endTime, carClass: a.carClass, entries: [a] });
    }
  }
  const sortedGroups = [...slotGroups.values()].sort((a, b) => {
    const byTime = a.startTime.getTime() - b.startTime.getTime();
    return byTime !== 0 ? byTime : a.carClass.localeCompare(b.carClass);
  });

  return (
    <div>
      <EnduranceSubNav enduranceId={id} title={endurance.title} />
      <div className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-3">
        <p className="text-sm text-brand-text">Circuit : {endurance.track}</p>
        <p className="text-sm text-brand-muted">{fmt(endurance.startDate)} → {fmt(endurance.endDate)}</p>
        <div className="flex flex-wrap gap-1.5">
          {parseCarClasses(endurance.carClasses).map((c) => (
            <span key={c} className="px-2 py-0.5 rounded-full bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs">
              {ENDURANCE_CAR_CLASS_LABELS[c as EnduranceCarClass] ?? c}
            </span>
          ))}
        </div>
        {parseStartTimes(endurance.startTimes).length > 0 && (
          <div>
            <p className="text-xs font-medium text-brand-muted mb-1.5">🏁 Heures de départ</p>
            <div className="flex flex-wrap gap-1.5">
              {parseStartTimes(endurance.startTimes).map((t, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full border border-brand-border text-brand-text text-xs">
                  {fmt(t)}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-brand-text mb-3">
          Disponibilités déclarées {availabilities.length > 0 && `(${availabilities.length})`}
        </h2>
        {availabilities.length === 0 ? (
          <p className="text-sm text-brand-muted">Aucun pilote n&apos;a encore déclaré de disponibilité.</p>
        ) : (
          <div className="space-y-3">
            {sortedGroups.map((g) => (
              <div key={`${g.startTime.toISOString()}|${g.endTime.toISOString()}|${g.carClass}`} className="bg-brand-surface border border-brand-border rounded-xl p-3.5">
                <p className="text-xs font-medium text-brand-text mb-2">
                  🏁 {fmt(g.startTime)} → {fmt(g.endTime)} · {ENDURANCE_CAR_CLASS_LABELS[g.carClass as EnduranceCarClass] ?? g.carClass}
                  <span className="text-brand-muted font-normal"> — {g.entries.length} pilote{g.entries.length !== 1 ? "s" : ""}</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g.entries.map((a) => (
                    <span
                      key={a.id}
                      className={`px-2.5 py-1 rounded-full border text-xs ${
                        a.locked
                          ? "border-green-500/30 bg-green-500/10 text-green-400"
                          : "border-brand-border text-brand-text"
                      }`}
                    >
                      {a.user.name ?? "Pilote"}{a.locked && " ✓"}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
