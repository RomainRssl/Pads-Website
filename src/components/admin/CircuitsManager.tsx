"use client";

import { useEffect, useState } from "react";
import { LMU_TRACKS } from "@/lib/tracks";
import { CUSTOM_GROUP_LABEL } from "@/lib/use-track-groups";

export default function CircuitsManager() {
  const [customTracks, setCustomTracks] = useState<string[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [newTrack, setNewTrack] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/track-capacities")
      .then((r) => r.json())
      .then((data: Record<string, number>) => {
        setInputs((prev) => {
          const next = { ...prev };
          for (const [track, cap] of Object.entries(data)) {
            if (next[track] === undefined) next[track] = String(cap);
          }
          return next;
        });
      });
    fetch("/api/admin/custom-tracks")
      .then((r) => (r.ok ? r.json() : []))
      .then((names: string[]) => setCustomTracks(Array.isArray(names) ? names : []));
  }, []);

  async function handleSave(track: string) {
    const val = parseInt(inputs[track], 10);
    if (!val || val < 1) return;
    setSaving((p) => ({ ...p, [track]: true }));
    try {
      const res = await fetch("/api/admin/track-capacities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track, capacity: val }),
      });
      if (res.ok) {
        setSaved((p) => ({ ...p, [track]: true }));
        setTimeout(() => setSaved((p) => ({ ...p, [track]: false })), 2000);
      }
    } finally {
      setSaving((p) => ({ ...p, [track]: false }));
    }
  }

  async function handleAdd() {
    const name = newTrack.trim();
    if (!name) return;
    setAdding(true);
    setAddError(null);
    try {
      const res = await fetch("/api/admin/custom-tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setCustomTracks((p) => [...p, name].sort((a, b) => a.localeCompare(b)));
        setNewTrack("");
      } else {
        const data = await res.json().catch(() => null);
        setAddError(data?.error ?? "Erreur lors de l'ajout");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(name: string) {
    if (!confirm(`Supprimer le circuit « ${name} » de la liste ?`)) return;
    setRemoving((p) => ({ ...p, [name]: true }));
    try {
      const res = await fetch("/api/admin/custom-tracks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        setCustomTracks((p) => p.filter((t) => t !== name));
      }
    } finally {
      setRemoving((p) => ({ ...p, [name]: false }));
    }
  }

  function renderCapacityRow(track: string, deletable: boolean) {
    return (
      <div
        key={track}
        className="flex items-center gap-3 bg-brand-surface border border-brand-border rounded-xl px-4 py-3"
      >
        <span className="flex-1 text-sm text-brand-text truncate">{track}</span>
        <input
          type="number"
          min={1}
          value={inputs[track] ?? ""}
          onChange={(e) => setInputs((p) => ({ ...p, [track]: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && handleSave(track)}
          placeholder="—"
          className="w-24 px-3 py-1.5 rounded-lg bg-brand-dark border border-brand-border text-white font-mono text-sm text-center focus:outline-none focus:border-brand-orange transition-colors"
        />
        <span className="text-xs text-brand-muted w-12">pilotes</span>
        <button
          onClick={() => handleSave(track)}
          disabled={saving[track] || !inputs[track]}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            saved[track]
              ? "bg-green-500/20 border border-green-500/40 text-green-400"
              : "bg-brand-orange/10 border border-brand-orange/30 text-brand-orange hover:bg-brand-orange/20 disabled:opacity-40"
          }`}
        >
          {saved[track] ? "✓ Sauvegardé" : saving[track] ? "…" : "Sauvegarder"}
        </button>
        {deletable && (
          <button
            onClick={() => handleRemove(track)}
            disabled={removing[track]}
            title="Supprimer ce circuit"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-brand-red/10 border border-brand-red/30 text-brand-red hover:bg-brand-red/20 disabled:opacity-40 transition-colors"
          >
            {removing[track] ? "…" : "✕"}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Ajout manuel d'un circuit */}
      <div>
        <h2 className="text-xs font-semibold text-brand-orange uppercase tracking-widest mb-3">
          Ajouter un circuit
        </h2>
        <div className="flex items-center gap-3 bg-brand-surface border border-brand-border rounded-xl px-4 py-3">
          <input
            type="text"
            value={newTrack}
            onChange={(e) => setNewTrack(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Nom du circuit (ex : Nürburgring Nordschleife)"
            className="flex-1 px-3 py-1.5 rounded-lg bg-brand-dark border border-brand-border text-white text-sm focus:outline-none focus:border-brand-orange transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newTrack.trim()}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-orange/10 border border-brand-orange/30 text-brand-orange hover:bg-brand-orange/20 disabled:opacity-40 transition-colors"
          >
            {adding ? "…" : "+ Ajouter"}
          </button>
        </div>
        {addError && <p className="text-xs text-brand-red mt-2">{addError}</p>}
        <p className="text-xs text-brand-muted mt-2">
          Le circuit sera disponible dans tous les sélecteurs (courses, endurances) sous le groupe «&nbsp;{CUSTOM_GROUP_LABEL}&nbsp;».
        </p>
      </div>

      {/* Circuits ajoutés manuellement */}
      {customTracks.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-brand-orange uppercase tracking-widest mb-3">
            {CUSTOM_GROUP_LABEL}
          </h2>
          <div className="space-y-2">
            {customTracks.map((track) => renderCapacityRow(track, true))}
          </div>
        </div>
      )}

      {/* Circuits du jeu (liste statique) */}
      {LMU_TRACKS.filter((g) => g.group !== "Mystère").map((group) => (
        <div key={group.group}>
          <h2 className="text-xs font-semibold text-brand-orange uppercase tracking-widest mb-3">
            {group.group}
          </h2>
          <div className="space-y-2">
            {group.options.map((track) => renderCapacityRow(track, false))}
          </div>
        </div>
      ))}
    </div>
  );
}
