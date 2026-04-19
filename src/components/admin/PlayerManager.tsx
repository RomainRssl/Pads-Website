"use client";

import { useState } from "react";

interface Team { id: string; name: string; }
interface Player {
  id: string;
  username: string;
  discordId: string | null;
  xp: number;
  money: number;
  finishedRaces: number;
  cleanRaces: number;
  team: Team | null;
}

interface Props {
  initialPlayers: Player[];
  teams: Team[];
}

export default function PlayerManager({ initialPlayers, teams }: Props) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDiscordId, setEditDiscordId] = useState("");
  const [editTeamId, setEditTeamId] = useState("");

  // New player form
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
    setPlayers((prev) => [...prev, data].sort((a, b) => a.username.localeCompare(b.username)));
    setNewUsername(""); setNewDiscordId(""); setNewTeamId("");
  }

  async function deletePlayer(id: string, username: string) {
    if (!confirm(`Supprimer le pilote "${username}" ?`)) return;
    await fetch(`/api/admin/players/${id}`, { method: "DELETE" });
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/admin/players/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ discordId: editDiscordId || null, teamId: editTeamId || null }),
    });
    if (!res.ok) return;
    const updated = await res.json();
    setPlayers((prev) => prev.map((p) => p.id === id ? updated : p));
    setEditingId(null);
  }

  function startEdit(player: Player) {
    setEditingId(player.id);
    setEditDiscordId(player.discordId ?? "");
    setEditTeamId(player.team?.id ?? "");
    setError("");
  }

  return (
    <div className="space-y-6">
      {/* Add form */}
      <form onSubmit={addPlayer} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <input
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          placeholder="Pseudo (unique)"
          className="sm:col-span-1 bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-red text-sm"
        />
        <input
          type="text"
          value={newDiscordId}
          onChange={(e) => setNewDiscordId(e.target.value)}
          placeholder="Discord ID (optionnel)"
          className="sm:col-span-1 bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-red text-sm"
        />
        <select
          value={newTeamId}
          onChange={(e) => setNewTeamId(e.target.value)}
          className="sm:col-span-1 bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-brand-text focus:outline-none focus:border-brand-red text-sm"
        >
          <option value="">Sans écurie</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button
          type="submit"
          disabled={loading || !newUsername.trim()}
          className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red/80 text-white font-semibold transition-colors disabled:opacity-50 text-sm"
        >
          + Ajouter
        </button>
      </form>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Players table */}
      {players.length === 0 ? (
        <p className="text-brand-muted text-sm">Aucun pilote pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-brand-muted text-xs uppercase tracking-wider border-b border-brand-border">
                <th className="text-left pb-3 pr-4">Pilote</th>
                <th className="text-left pb-3 pr-4">Discord ID</th>
                <th className="text-left pb-3 pr-4">Écurie</th>
                <th className="text-right pb-3 pr-4">XP</th>
                <th className="text-right pb-3 pr-4">Argent</th>
                <th className="text-right pb-3 pr-4">Courses</th>
                <th className="text-right pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {players.map((player) => (
                <tr key={player.id}>
                  <td className="py-3 pr-4 font-semibold text-white">{player.username}</td>
                  <td className="py-3 pr-4">
                    {editingId === player.id ? (
                      <input
                        type="text"
                        value={editDiscordId}
                        onChange={(e) => setEditDiscordId(e.target.value)}
                        placeholder="Discord ID"
                        className="w-full bg-brand-dark border border-brand-border rounded px-2 py-1 text-brand-text text-xs focus:outline-none focus:border-brand-red"
                      />
                    ) : (
                      <span className="text-brand-muted font-mono text-xs">{player.discordId ?? "—"}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {editingId === player.id ? (
                      <select
                        value={editTeamId}
                        onChange={(e) => setEditTeamId(e.target.value)}
                        className="bg-brand-dark border border-brand-border rounded px-2 py-1 text-brand-text text-xs focus:outline-none focus:border-brand-red"
                      >
                        <option value="">Sans écurie</option>
                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    ) : (
                      <span className={player.team ? "text-brand-text" : "text-brand-muted"}>
                        {player.team?.name ?? "—"}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right text-brand-text">{player.xp.toLocaleString("fr-FR")}</td>
                  <td className="py-3 pr-4 text-right text-brand-text">{player.money.toLocaleString("fr-FR")}</td>
                  <td className="py-3 pr-4 text-right text-brand-muted">
                    {player.finishedRaces} <span className="text-xs">({player.cleanRaces} propres)</span>
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    {editingId === player.id ? (
                      <span className="flex gap-2 justify-end">
                        <button onClick={() => saveEdit(player.id)} className="text-green-400 hover:text-green-300 text-xs font-semibold">Enregistrer</button>
                        <button onClick={() => setEditingId(null)} className="text-brand-muted hover:text-brand-text text-xs">Annuler</button>
                      </span>
                    ) : (
                      <span className="flex gap-2 justify-end">
                        <button onClick={() => startEdit(player)} className="text-brand-muted hover:text-white text-xs transition-colors">Modifier</button>
                        <button onClick={() => deletePlayer(player.id, player.username)} className="text-red-400 hover:text-red-300 text-xs transition-colors">Supprimer</button>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
