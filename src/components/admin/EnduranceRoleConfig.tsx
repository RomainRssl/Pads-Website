"use client";

import { useEffect, useState } from "react";

interface DiscordRole {
  id: string;
  name: string;
  color: number;
}

function roleColor(color: number): string {
  if (color === 0) return "#64748B";
  return `#${color.toString(16).padStart(6, "0")}`;
}

export default function EnduranceRoleConfig() {
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/endurance-role")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRoles(data.roles);
        setSelected(data.enduranceRoleId ?? "");
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/endurance-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enduranceRoleId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-brand-text mb-1">Rôle Discord — accès Endurance</h3>
      <p className="text-xs text-brand-muted mb-4">
        Les membres possédant ce rôle sur le Discord peuvent accéder à la section endurance du site
        et reçoivent les DM d&apos;invitation.
      </p>

      {error && (
        <div className="mb-3 p-3 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-xs">
          {error}
        </div>
      )}

      {loading ? (
        <div className="h-10 rounded-lg bg-brand-border animate-pulse" />
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
          >
            <option value="">— Choisir un rôle —</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleSave}
            disabled={!selected || saving}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              saved
                ? "bg-green-500/20 border border-green-500/40 text-green-400"
                : "bg-brand-orange/10 border border-brand-orange/30 text-brand-orange hover:bg-brand-orange/20 disabled:opacity-40"
            }`}
          >
            {saved ? "✓ Sauvegardé" : saving ? "…" : "Sauvegarder"}
          </button>
        </div>
      )}
      {selected && roles.length > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-brand-muted">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: roleColor(roles.find((r) => r.id === selected)?.color ?? 0) }}
          />
          Rôle actif : {roles.find((r) => r.id === selected)?.name ?? selected}
        </div>
      )}
    </div>
  );
}
