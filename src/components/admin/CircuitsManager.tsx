"use client";

import { useEffect, useState } from "react";
import { LMU_TRACKS } from "@/lib/tracks";

const ALL_TRACKS = LMU_TRACKS.flatMap((g) => g.options).filter((t) => t !== "Mystère");

export default function CircuitsManager() {
  const [capacities, setCapacities] = useState<Record<string, number>>({});
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/admin/track-capacities")
      .then((r) => r.json())
      .then((data: Record<string, number>) => {
        setCapacities(data);
        const initial: Record<string, string> = {};
        for (const t of ALL_TRACKS) {
          initial[t] = data[t] ? String(data[t]) : "";
        }
        setInputs(initial);
      });
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
        setCapacities((p) => ({ ...p, [track]: val }));
        setSaved((p) => ({ ...p, [track]: true }));
        setTimeout(() => setSaved((p) => ({ ...p, [track]: false })), 2000);
      }
    } finally {
      setSaving((p) => ({ ...p, [track]: false }));
    }
  }

  return (
    <div className="space-y-8">
      {LMU_TRACKS.filter((g) => g.group !== "Mystère").map((group) => (
        <div key={group.group}>
          <h2 className="text-xs font-semibold text-brand-orange uppercase tracking-widest mb-3">
            {group.group}
          </h2>
          <div className="space-y-2">
            {group.options.map((track) => (
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
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
