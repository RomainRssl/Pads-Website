"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface DiscordRole {
  id: string;
  name: string;
  color: number;
}

function roleColor(color: number): string {
  if (color === 0) return "#64748B";
  return `#${color.toString(16).padStart(6, "0")}`;
}

export default function RolesPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/setup/roles")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setRoles(data.roles);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/setup/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminRoleId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue");
      router.push("/setup/done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <p className="text-4xl mb-4">🎭</p>
          <h1 className="font-heading text-3xl font-bold text-white mb-2">
            Choisir le rôle Admin
          </h1>
          <p className="text-brand-muted">
            Les membres ayant ce rôle pourront accéder au panel d'administration.
          </p>
        </div>

        <div className="bg-brand-card border border-brand-border rounded-xl p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-brand-border animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 mb-6 max-h-80 overflow-y-auto">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelected(role.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                    selected === role.id
                      ? "border-brand-red bg-brand-red/10"
                      : "border-brand-border hover:border-brand-muted bg-brand-surface"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: roleColor(role.color) }}
                  />
                  <span className="font-medium text-brand-text">{role.name}</span>
                  {selected === role.id && (
                    <span className="ml-auto text-brand-red text-sm">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!selected || saving}
            className="w-full px-6 py-3 rounded-lg bg-brand-red hover:bg-brand-red/80 disabled:bg-brand-red/40 disabled:cursor-not-allowed text-white font-bold transition-colors"
          >
            {saving ? "Enregistrement..." : "Confirmer le rôle admin"}
          </button>
        </div>
      </div>
    </div>
  );
}
