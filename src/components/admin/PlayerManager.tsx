"use client";

import { useState } from "react";

interface Team { id: string; name: string; }
interface Category { id: string; name: string; }
interface Player {
  id: string;
  username: string;
  discordId: string | null;
  xp: number;
  money: number;
  reputation: number;
  finishedRaces: number;
  cleanRaces: number;
  team: Team | null;
  categories: { category: Category }[];
}

interface Props {
  initialPlayers: Player[];
  teams: Team[];
  categories: Category[];
}

export default function PlayerManager({ initialPlayers, teams, categories }: Props) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDiscordId, setEditDiscordId] = useState("");
  const [editTeamId, setEditTeamId] = useState("");
  const [editReputation, setEditReputation] = useState(0);
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([]);

  const [newUsername, setNewUsername] = useState("");
  const [newDiscordId, setNewDiscordId] = useState("");
  const [newTeamId, setNewTeamId] = useState("");

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: newUsername, discordId: newDiscordId || null, teamId: newTeamId || null }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    setPlayers((prev) => [...prev, { ...data, categories: [] }].sort((a, b) => a.username.localeCompare(b.username)));
    setNewUsername(""); setNewDiscordId(""); setNewTeamId("");
  }

  async function deletePlayer(id: string, username: string) {
    if (!confirm(`Supprimer le pilote "${username}" ?`)) return;
    await fetch(`/api/admin/players/${id}`, { method: "DELETE" });
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  async function saveEdit(id: string) {
    const [patchRes, catRes] = await Promise.all([
      fetch(`/api/admin/players/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ discordId: editDiscordId || null, teamId: editTeamId || null, reputation: editReputation }),
      }),
      fetch(`/api/admin/players/${id}/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: editCategoryIds }),
      }),
    ]);
    if (!patchRes.ok) return;
    const updated = await patchRes.json();
    const newCategories = categories
      .filter((c) => editCategoryIds.includes(c.id))
      .map((c) => ({ category: c }));
    setPlayers((prev) => prev.map((p) => p.id === id ? { ...updated, categories: newCategories } : p));
    setEditingId(null);
  }

  function startEdit(player: Player) {
    setEditingId(player.id);
    setEditDiscordId(player.discordId ?? "");
    setEditTeamId(player.team?.id ?? "");
    setEditReputation(player.reputation);
    setEditCategoryIds(player.categories.map((pc) => pc.category.id));
    setError("");
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={addPlayer} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
          placeholder="Pseudo (unique)"
          className="bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-red text-sm"
        />
        <input type="text" value={newDiscordId} onChange={(e) => setNewDiscordId(e.target.value)}
          placeholder="Discord ID (optionnel)"
          className="bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-red text-sm"
        />
        <select value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)}
          className="bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-brand-text focus:outline-none focus:border-brand-red text-sm"
        >
          <option value="">Sans écurie</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="submit" disabled={loading || !newUsername.trim()}
          className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red/80 text-white font-semibold transition-colors disabled:opacity-50 text-sm">
          + Ajouter
        </button>
      </form>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {players.length === 0 ? (
        <p className="text-brand-muted text-sm">Aucun pilote pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {players.map((player) => (
            <div key={player.id} className="bg-brand-dark border border-brand-border rounded-xl p-4">
              {editingId === player.id ? (
                <div className="space-y-4">
                  <p className="font-heading font-bold text-white text-lg">{player.username.toUpperCase()}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-brand-muted block mb-1">Discord ID</label>
                      <input type="text" value={editDiscordId} onChange={(e) => setEditDiscordId(e.target.value)}
                        placeholder="Discord ID"
                        className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-brand-text text-sm focus:outline-none focus:border-brand-red"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-brand-muted block mb-1">Écurie</label>
                      <select value={editTeamId} onChange={(e) => setEditTeamId(e.target.value)}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-brand-text text-sm focus:outline-none focus:border-brand-red"
                      >
                        <option value="">Sans écurie</option>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-brand-muted block mb-1">Réputation (0–100)</label>
                      <input type="number" min={0} max={100} value={editReputation}
                        onChange={(e) => setEditReputation(Number(e.target.value))}
                        className="w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-brand-text text-sm focus:outline-none focus:border-brand-red"
                      />
                    </div>
                  </div>

                  {categories.length > 0 && (
                    <div>
                      <label className="text-xs text-brand-muted block mb-2">Catégories</label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => {
                          const checked = editCategoryIds.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setEditCategoryIds((prev) =>
                                checked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                              )}
                              className={`px-3 py-1 rounded-lg text-sm font-bold border transition-colors ${
                                checked
                                  ? "bg-brand-red/10 border-brand-red text-brand-red"
                                  : "bg-transparent border-brand-border text-brand-muted hover:border-brand-text"
                              }`}
                            >
                              {checked ? "✓ " : ""}{cat.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(player.id)}
                      className="px-4 py-1.5 rounded-lg bg-brand-red text-white text-sm font-semibold">Enregistrer</button>
                    <button onClick={() => setEditingId(null)}
                      className="px-4 py-1.5 rounded-lg border border-brand-border text-brand-muted text-sm">Annuler</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-bold text-white">{player.username.toUpperCase()}</span>
                      {player.team && <span className="text-xs text-brand-muted">· {player.team.name}</span>}
                      {player.categories.map((pc) => (
                        <span key={pc.category.id} className="text-xs px-1.5 py-0.5 rounded bg-brand-red/10 text-brand-red border border-brand-red/30 font-bold">
                          {pc.category.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-brand-muted">
                      <span>{player.xp.toLocaleString("fr-FR")} XP</span>
                      <span>{player.money.toLocaleString("fr-FR")} crédits</span>
                      <span>Réputation : {player.reputation}/100</span>
                      <span>{player.finishedRaces} courses</span>
                    </div>
                  </div>
                  <button onClick={() => startEdit(player)} className="text-xs text-brand-muted hover:text-white transition-colors shrink-0">Modifier</button>
                  <button onClick={() => deletePlayer(player.id, player.username)} className="text-xs text-red-400 hover:text-red-300 transition-colors shrink-0">Supprimer</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
