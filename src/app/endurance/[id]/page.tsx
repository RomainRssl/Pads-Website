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
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
