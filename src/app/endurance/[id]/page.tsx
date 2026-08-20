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
          <div className="space-y-2">
            {availabilities.map((a) => (
              <div key={a.id} className="bg-brand-surface border border-brand-border rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-brand-text truncate">{a.user.name ?? "Pilote"}</p>
                  <p className="text-xs text-brand-muted">
                    {ENDURANCE_CAR_CLASS_LABELS[a.carClass as EnduranceCarClass] ?? a.carClass} · {fmt(a.startTime)} → {fmt(a.endTime)}
                  </p>
                </div>
                {a.locked && (
                  <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs shrink-0">
                    Engagé
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
