"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { ENDURANCE_CAR_CLASS_LABELS, type EnduranceCarClass } from "@/lib/endurance";

interface PoolSlot {
  id: string;
  carClass: string;
  startTime: string;
  endTime: string;
  user: { id: string; name: string | null; image: string | null };
}

interface GroupMember {
  id: string;
  userId: string;
  status: string;
  user: { id: string; name: string | null; image: string | null };
}

interface Group {
  id: string;
  teamName: string;
  carClass: string;
  startTime: string;
  endTime: string;
  status: string;
  members: GroupMember[];
}

function fmt(d: string): string {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "En attente de confirmation",
  CONFIRMED: "Confirmé",
  CANCELLED: "Annulé",
};

export default function TeamBuilder({
  enduranceId,
  carClasses,
  startTimes,
}: {
  enduranceId: string;
  carClasses: string[];
  startTimes: string[];
}) {
  const { data: session } = useSession();
  const [pool, setPool] = useState<PoolSlot[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  const [teamName, setTeamName] = useState("");
  const [carClass, setCarClass] = useState(carClasses[0] ?? "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function load() {
    Promise.all([
      fetch(`/api/endurance/${enduranceId}/availability`).then((r) => r.json()),
      fetch(`/api/endurance/${enduranceId}/groups`).then((r) => r.json()),
    ]).then(([avail, grp]) => {
      setPool(avail.pool ?? []);
      setGroups(grp ?? []);
    }).finally(() => setLoading(false));
  }

  useEffect(load, [enduranceId]);

  const eligiblePool = useMemo(() => {
    if (!startTime || !endTime) return pool.filter((s) => s.carClass === carClass);
    const start = new Date(startTime);
    const end = new Date(endTime);
    return pool.filter(
      (s) => s.carClass === carClass && new Date(s.startTime) <= start && new Date(s.endTime) >= end
    );
  }, [pool, carClass, startTime, endTime]);

  function toggleSlot(slotId: string) {
    setSelected((prev) => (prev.includes(slotId) ? prev.filter((s) => s !== slotId) : [...prev, slotId]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selected.length === 0) {
      setError("Sélectionne au moins un pilote (dont toi-même si tu conduis).");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/endurance/${enduranceId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName,
          carClass,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          availabilityIds: selected,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Une erreur est survenue");
      setTeamName("");
      setSelected([]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel(groupId: string) {
    if (!confirm("Annuler cet équipage ? Les créneaux des membres redeviendront disponibles.")) return;
    setActionError(null);
    const res = await fetch(`/api/endurance/groups/${groupId}/cancel`, { method: "POST" });
    if (res.ok) {
      load();
    } else {
      const data = await res.json().catch(() => ({}));
      setActionError(data.error ?? "Impossible d'annuler cet équipage");
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-brand-text">Former un équipage</h3>
        <p className="text-xs text-brand-muted">
          Choisis une catégorie et un créneau, puis sélectionne les pilotes disponibles à intégrer.
          Chacun recevra un DM pour confirmer sa participation.
        </p>

        {error && (
          <div className="p-3 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1.5">Nom de la team</label>
          <input
            required
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="PADS Racing #1"
            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1.5">Catégorie</label>
          <select
            value={carClass}
            onChange={(e) => { setCarClass(e.target.value); setSelected([]); }}
            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
          >
            {carClasses.map((c) => (
              <option key={c} value={c}>{ENDURANCE_CAR_CLASS_LABELS[c as EnduranceCarClass] ?? c}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1.5">Début du relais/stint</label>
            <select
              required
              value={startTime}
              onChange={(e) => { setStartTime(e.target.value); setEndTime(""); setSelected([]); }}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
            >
              <option value="">— Choisir —</option>
              {startTimes.map((t) => (
                <option key={t} value={t}>{fmt(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1.5">Fin</label>
            <select
              required
              value={endTime}
              disabled={!startTime}
              onChange={(e) => { setEndTime(e.target.value); setSelected([]); }}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange disabled:opacity-50"
            >
              <option value="">— Choisir —</option>
              {startTimes.filter((t) => !startTime || new Date(t) > new Date(startTime)).map((t) => (
                <option key={t} value={t}>{fmt(t)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1.5">
            Pilotes disponibles {startTime && endTime ? "sur ce créneau" : "pour cette catégorie"}
          </label>
          {loading ? (
            <div className="h-10 rounded-lg bg-brand-border animate-pulse" />
          ) : eligiblePool.length === 0 ? (
            <p className="text-xs text-brand-muted">Aucun pilote disponible pour ces critères.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {eligiblePool.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selected.includes(s.id)
                      ? "border-brand-orange bg-brand-orange/10"
                      : "border-brand-border hover:border-brand-muted"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(s.id)}
                    onChange={() => toggleSlot(s.id)}
                    className="shrink-0"
                  />
                  <span className="text-sm text-brand-text flex-1">
                    {s.user.name ?? "Pilote"}
                    {s.user.id === session?.user?.id && " (moi)"}
                  </span>
                  <span className="text-xs text-brand-muted">{fmt(s.startTime)} → {fmt(s.endTime)}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-brand-orange hover:bg-brand-orange/80 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {submitting ? "Création…" : "Créer l'équipage et inviter les pilotes"}
        </button>
      </form>

      <div>
        <h3 className="text-sm font-semibold text-brand-text mb-3">Équipages</h3>
        {actionError && (
          <div className="mb-3 p-3 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs">
            {actionError}
          </div>
        )}
        {loading ? (
          <div className="h-16 rounded-lg bg-brand-border animate-pulse" />
        ) : groups.length === 0 ? (
          <p className="text-sm text-brand-muted">Aucun équipage formé pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => {
              const isMember = g.members.some((m) => m.userId === session?.user?.id);
              return (
                <div key={g.id} className="bg-brand-surface border border-brand-border rounded-xl p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brand-text">
                        {g.teamName} · {ENDURANCE_CAR_CLASS_LABELS[g.carClass as EnduranceCarClass] ?? g.carClass}
                      </p>
                      <p className="text-xs text-brand-muted">{fmt(g.startTime)} → {fmt(g.endTime)}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {g.members.map((m) => (
                          <span
                            key={m.id}
                            className={`px-2 py-0.5 rounded-full border text-xs ${
                              m.status === "CONFIRMED"
                                ? "border-green-500/30 bg-green-500/10 text-green-400"
                                : "border-brand-border text-brand-muted"
                            }`}
                          >
                            {m.user.name ?? "Pilote"} {m.status === "CONFIRMED" ? "✓" : "…"}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                      <span className={`text-xs font-medium ${g.status === "CONFIRMED" ? "text-green-400" : "text-brand-muted"}`}>
                        {STATUS_LABEL[g.status] ?? g.status}
                      </span>
                      {isMember && (
                        <button
                          onClick={() => handleCancel(g.id)}
                          className="px-3 py-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-red hover:border-brand-red text-xs font-medium transition-colors"
                        >
                          Annuler l&apos;équipage
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
