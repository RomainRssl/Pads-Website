"use client";

import { useState } from "react";

interface Team {
  id: string;
  name: string;
  xp: number;
  _count: { players: number };
}

interface Props {
  initialTeams: Team[];
}

export default function TeamManager({ initialTeams }: Props) {
  const [teams, setTeams] = useState<Team[]>(initialTeams);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function addTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setTeams((prev) => [...prev, { ...data, _count: { players: 0 } }].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName("");
  }

  async function deleteTeam(id: string) {
    if (!confirm("Supprimer cette écurie ? Les pilotes seront détachés.")) return;
    await fetch(`/api/admin/teams/${id}`, { method: "DELETE" });
    setTeams((prev) => prev.filter((t) => t.id !== id));
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    const res = await fetch(`/api/admin/teams/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    const updated = await res.json();
    setTeams((prev) => prev.map((t) => t.id === id ? { ...t, name: updated.name } : t).sort((a, b) => a.name.localeCompare(b.name)));
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={addTeam} className="flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom de l'écurie"
          className="flex-1 bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-orange"
        />
        <button
          type="submit"
          disabled={loading || !newName.trim()}
          className="px-5 py-2.5 rounded-lg bg-brand-orange hover:bg-brand-orange/80 text-white font-semibold transition-colors disabled:opacity-50"
        >
          + Ajouter
        </button>
      </form>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Teams list */}
      {teams.length === 0 ? (
        <p className="text-brand-muted text-sm">Aucune écurie pour le moment.</p>
      ) : (
        <div className="divide-y divide-brand-border">
          {teams.map((team) => (
            <div key={team.id} className="flex items-center gap-4 py-3">
              {editingId === team.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 bg-brand-dark border border-brand-border rounded-lg px-3 py-1.5 text-brand-text focus:outline-none focus:border-brand-orange text-sm"
                    autoFocus
                  />
                  <button onClick={() => saveEdit(team.id)} className="text-green-400 hover:text-green-300 text-sm font-semibold">Enregistrer</button>
                  <button onClick={() => setEditingId(null)} className="text-brand-muted hover:text-brand-text text-sm">Annuler</button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <span className="font-semibold text-white">{team.name}</span>
                    <span className="ml-3 text-xs text-brand-muted">
                      {team._count.players} pilote{team._count.players !== 1 ? "s" : ""} · {team.xp.toLocaleString("fr-FR")} XP
                    </span>
                  </div>
                  <button
                    onClick={() => { setEditingId(team.id); setEditName(team.name); setError(""); }}
                    className="text-xs text-brand-muted hover:text-white transition-colors"
                  >
                    Renommer
                  </button>
                  <button
                    onClick={() => deleteTeam(team.id)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Supprimer
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
