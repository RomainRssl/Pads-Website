import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EnduranceSubNav from "@/components/endurance/EnduranceSubNav";
import { ENDURANCE_CAR_CLASS_LABELS, type EnduranceCarClass } from "@/lib/endurance";

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: "bg-brand-orange border-brand-orange text-white",
  PENDING: "bg-brand-orange/20 border-brand-orange/40 border-dashed text-brand-orange",
};

function hourLabel(d: Date): string {
  return d.toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

function fullLabel(d: Date): string {
  return d.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
}

export default async function CalendrierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const endurance = await prisma.endurance.findUnique({ where: { id } });
  if (!endurance) notFound();

  const groups = await prisma.enduranceGroup.findMany({
    where: { enduranceId: id, status: { in: ["PENDING", "CONFIRMED"] } },
    include: { members: { include: { user: { select: { name: true } } } } },
    orderBy: [{ carClass: "asc" }, { startTime: "asc" }],
  });

  const rangeStart = endurance.startDate.getTime();
  const rangeEnd = endurance.endDate.getTime();
  const totalMs = Math.max(1, rangeEnd - rangeStart);

  function pct(ms: number): number {
    return Math.min(100, Math.max(0, ((ms - rangeStart) / totalMs) * 100));
  }

  // Grille horaire — un repère toutes les N heures selon la durée totale
  const totalHours = totalMs / 3_600_000;
  const stepHours = totalHours > 60 ? 6 : totalHours > 30 ? 3 : 1;
  const ticks: Date[] = [];
  for (let t = new Date(endurance.startDate); t.getTime() <= rangeEnd; t = new Date(t.getTime() + stepHours * 3_600_000)) {
    ticks.push(new Date(t));
  }

  return (
    <div>
      <EnduranceSubNav enduranceId={id} title={endurance.title} />

      <div className="flex items-center gap-4 mb-4 text-xs text-brand-muted">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-brand-orange inline-block" /> Confirmé</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded border border-dashed border-brand-orange/40 bg-brand-orange/20 inline-block" /> En attente</span>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-brand-muted">Aucun équipage planifié pour le moment.</p>
      ) : (
        <div className="bg-brand-surface border border-brand-border rounded-xl p-4 overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Grille horaire */}
            <div className="relative h-6 mb-2 ml-40">
              {ticks.map((t, i) => (
                <div
                  key={i}
                  className="absolute top-0 text-[10px] text-brand-muted -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${pct(t.getTime())}%` }}
                >
                  {hourLabel(t)}
                </div>
              ))}
            </div>

            {/* Lignes équipages */}
            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.id} className="flex items-center gap-3">
                  <div className="w-40 shrink-0 text-xs text-brand-text truncate">
                    <p className="font-medium truncate">{g.teamName}</p>
                    <p className="text-brand-muted truncate">
                      {ENDURANCE_CAR_CLASS_LABELS[g.carClass as EnduranceCarClass] ?? g.carClass}
                    </p>
                  </div>
                  <div className="relative flex-1 h-9 bg-brand-dark/40 rounded-lg border border-brand-border/50">
                    {ticks.map((t, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 w-px bg-brand-border/40"
                        style={{ left: `${pct(t.getTime())}%` }}
                      />
                    ))}
                    <div
                      title={`${g.teamName} · ${fullLabel(g.startTime)} → ${fullLabel(g.endTime)}\n${g.members.map((m) => m.user.name ?? "Pilote").join(", ")}`}
                      className={`absolute top-1 bottom-1 rounded-md border px-2 flex items-center text-[11px] font-medium overflow-hidden whitespace-nowrap ${STATUS_STYLE[g.status] ?? ""}`}
                      style={{
                        left: `${pct(g.startTime.getTime())}%`,
                        width: `${Math.max(2, pct(g.endTime.getTime()) - pct(g.startTime.getTime()))}%`,
                      }}
                    >
                      {g.members.map((m) => m.user.name ?? "?").join(", ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
