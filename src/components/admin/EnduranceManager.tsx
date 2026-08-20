"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LMU_TRACKS } from "@/lib/tracks";
import { ENDURANCE_CAR_CLASSES, ENDURANCE_CAR_CLASS_LABELS, parseCarClasses, parseStartTimes } from "@/lib/endurance";

interface EnduranceRow {
  id: string;
  title: string;
  track: string;
  carClasses: string;
  startDate: string;
  endDate: string;
  startTimes: string;
  _count: { availabilities: number; groups: number };
}

const initialForm = {
  title: "",
  track: "",
  startDate: "",
  endDate: "",
};

function fmt(d: string): string {
  return new Date(d).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export default function EnduranceManager() {
  const [endurances, setEndurances] = useState<EnduranceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [carClasses, setCarClasses] = useState<string[]>([]);
  const [startTimes, setStartTimes] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/endurances")
      .then((r) => r.json())
      .then(setEndurances)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function toggleCarClass(c: string) {
    setCarClasses((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  function updateStartTime(idx: number, val: string) {
    setStartTimes((prev) => prev.map((t, i) => (i === idx ? val : t)));
  }

  function addStartTime() {
    setStartTimes((prev) => [...prev, ""]);
  }

  function removeStartTime(idx: number) {
    setStartTimes((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (carClasses.length === 0) {
      setError("Sélectionnez au moins une catégorie de voiture");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/endurances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          carClasses,
          startDate: new Date(form.startDate).toISOString(),
          endDate: new Date(form.endDate).toISOString(),
          startTimes: startTimes.filter((t) => t !== "").map((t) => new Date(t).toISOString()),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Une erreur est survenue");
      setForm(initialForm);
      setCarClasses([]);
      setStartTimes([""]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette endurance ? Les disponibilités et équipages associés seront supprimés.")) return;
    const res = await fetch(`/api/admin/endurances/${id}`, { method: "DELETE" });
    if (res.ok) setEndurances((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-brand-text">Créer une endurance</h3>

        {error && (
          <div className="p-3 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1.5">Titre</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="24h du Mans Ultimate — Édition PADS"
            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1.5">Circuit</label>
          <select
            required
            value={form.track}
            onChange={(e) => setForm((p) => ({ ...p, track: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
          >
            <option value="">— Choisir un circuit —</option>
            {LMU_TRACKS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1.5">Catégories de voitures disponibles</label>
          <div className="flex flex-wrap gap-2">
            {ENDURANCE_CAR_CLASSES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => toggleCarClass(c)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  carClasses.includes(c)
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-brand-border text-brand-muted hover:text-brand-text"
                }`}
              >
                {ENDURANCE_CAR_CLASS_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-muted mb-1.5">Heures de départ</label>
          <p className="text-xs text-brand-muted mb-2">
            Ce sont les seuls horaires que les pilotes pourront choisir en déclarant leurs disponibilités.
          </p>
          <div className="space-y-2">
            {startTimes.map((t, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="datetime-local"
                  value={t}
                  min={form.startDate}
                  max={form.endDate}
                  onChange={(e) => updateStartTime(idx, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
                />
                {startTimes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStartTime(idx)}
                    className="shrink-0 px-3 py-2 rounded-lg border border-brand-border text-brand-muted hover:text-brand-red hover:border-brand-red transition-colors text-lg leading-none"
                  >×</button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addStartTime}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-brand-border text-brand-muted hover:border-brand-orange hover:text-brand-orange transition-colors text-sm"
            >
              <span className="text-lg leading-none">+</span> Ajouter une heure de départ
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1.5">Début du week-end</label>
            <input
              type="datetime-local" required
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-brand-muted mb-1.5">Fin du week-end</label>
            <input
              type="datetime-local" required
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 rounded-lg bg-brand-orange hover:bg-brand-orange/80 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {submitting ? "Création…" : "Créer l'endurance et notifier les pilotes"}
        </button>
      </form>

      <div>
        <h3 className="text-sm font-semibold text-brand-text mb-3">Endurances</h3>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-brand-border animate-pulse" />)}
          </div>
        ) : endurances.length === 0 ? (
          <p className="text-sm text-brand-muted">Aucune endurance créée pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {endurances.map((e) => (
              <div key={e.id} className="bg-brand-surface border border-brand-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-brand-text truncate">{e.title}</p>
                  <p className="text-xs text-brand-muted">
                    {e.track} · {parseCarClasses(e.carClasses).join(", ")}
                  </p>
                  <p className="text-xs text-brand-muted">{fmt(e.startDate)} → {fmt(e.endDate)}</p>
                  {parseStartTimes(e.startTimes).length > 0 && (
                    <p className="text-xs text-brand-muted mt-1">
                      🏁 {parseStartTimes(e.startTimes).map((d) => fmt(d.toISOString())).join(" · ")}
                    </p>
                  )}
                  <p className="text-xs text-brand-muted mt-1">
                    {e._count.availabilities} dispo{e._count.availabilities !== 1 ? "s" : ""} · {e._count.groups} équipage{e._count.groups !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`/endurance/${e.id}/calendrier`} className="px-3 py-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text text-xs font-medium transition-colors">
                    📅 Calendrier
                  </Link>
                  <button onClick={() => handleDelete(e.id)} className="px-3 py-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-red hover:border-brand-red text-xs font-medium transition-colors">
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
