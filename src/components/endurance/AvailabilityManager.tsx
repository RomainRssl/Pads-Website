"use client";

import { useEffect, useState } from "react";
import { ENDURANCE_CAR_CLASS_LABELS, type EnduranceCarClass } from "@/lib/endurance";

interface Slot {
  id: string;
  carClass: string;
  startTime: string;
  endTime: string;
  locked: boolean;
}

function fmt(d: string): string {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export default function AvailabilityManager({
  enduranceId,
  carClasses,
  startTimes,
}: {
  enduranceId: string;
  carClasses: string[];
  startTimes: string[];
}) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [carClass, setCarClass] = useState(carClasses[0] ?? "");
  const [startTime, setStartTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch(`/api/endurance/${enduranceId}/availability`)
      .then((r) => r.json())
      .then((data) => setSlots(data.mine ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(load, [enduranceId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!startTime) {
      setError("Choisissez une heure de départ parmi celles proposées.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/endurance/${enduranceId}/availability`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carClass,
          startTime: new Date(startTime).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Une erreur est survenue");
      setStartTime("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(slotId: string) {
    const res = await fetch(`/api/endurance/${enduranceId}/availability/${slotId}`, { method: "DELETE" });
    if (res.ok) {
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Impossible de supprimer ce créneau");
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-brand-text">Ajouter une disponibilité</h3>
        <p className="text-xs text-brand-muted">
          Indique à quelle heure de départ tu es disponible, pour quelle catégorie. Tu peux ajouter
          plusieurs disponibilités (autres heures, autres catégories).
        </p>

        {error && (
          <div className="p-3 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs">
            {error}
          </div>
        )}

        {startTimes.length === 0 ? (
          <p className="text-sm text-brand-muted">
            Les organisateurs n&apos;ont pas encore défini d&apos;heures de départ pour cette endurance.
          </p>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1.5">Catégorie de voiture</label>
              <select
                value={carClass}
                onChange={(e) => setCarClass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
              >
                {carClasses.map((c) => (
                  <option key={c} value={c}>{ENDURANCE_CAR_CLASS_LABELS[c as EnduranceCarClass] ?? c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-brand-muted mb-1.5">Heure de départ</label>
              <select
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
              >
                <option value="">— Choisir —</option>
                {startTimes.map((t) => (
                  <option key={t} value={t}>{fmt(t)}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !carClass || !startTime}
              className="w-full py-2.5 rounded-lg bg-brand-orange hover:bg-brand-orange/80 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {submitting ? "Ajout…" : "+ Ajouter cette disponibilité"}
            </button>
          </>
        )}
      </form>

      <div>
        <h3 className="text-sm font-semibold text-brand-text mb-3">Mes disponibilités déclarées</h3>
        {loading ? (
          <div className="h-16 rounded-lg bg-brand-border animate-pulse" />
        ) : slots.length === 0 ? (
          <p className="text-sm text-brand-muted">Aucune disponibilité déclarée pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {slots.map((s) => (
              <div key={s.id} className="bg-brand-surface border border-brand-border rounded-xl p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-brand-text">
                    {ENDURANCE_CAR_CLASS_LABELS[s.carClass as EnduranceCarClass] ?? s.carClass} · Départ {fmt(s.startTime)}
                  </p>
                  <p className="text-xs text-brand-muted">Jusqu&apos;à {fmt(s.endTime)}</p>
                </div>
                {s.locked ? (
                  <span className="px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs shrink-0">
                    Engagé dans un équipage
                  </span>
                ) : (
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="px-3 py-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-red hover:border-brand-red text-xs font-medium transition-colors shrink-0"
                  >
                    Retirer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
