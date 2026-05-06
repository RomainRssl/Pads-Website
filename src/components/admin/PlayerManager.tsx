"use client";

import { useState } from "react";

interface Team { id: string; name: string; }
interface Category { id: string; name: string; }
interface Player {
  id: string;
  username: string;
  discordUsername: string | null;
  discordId: string | null;
  xp: number;
  money: number;
  reputation: number;
  licensePoints: number;
  totalRaces: number;
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

  // — Add form
  const [newUsername, setNewUsername] = useState("");
  const [newDiscordUsername, setNewDiscordUsername] = useState("");
  const [newDiscordId, setNewDiscordId] = useState("");
  const [newTeamId, setNewTeamId] = useState("");

  // — Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editDiscordUsername, setEditDiscordUsername] = useState("");
  const [editDiscordId, setEditDiscordId] = useState("");
  const [editTeamId, setEditTeamId] = useState("");
  const [editReputation, setEditReputation] = useState(0);
  const [editXp, setEditXp] = useState(0);
  const [editMoney, setEditMoney] = useState(0);
  const [editLicensePoints, setEditLicensePoints] = useState(0);
  const [editTotalRaces, setEditTotalRaces] = useState(0);
  const [editFinishedRaces, setEditFinishedRaces] = useState(0);
  const [editCleanRaces, setEditCleanRaces] = useState(0);
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>([]);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    const username = newUsername.trim();
    const discordId = newDiscordId.trim();
    if (!username) { setError("Le Pseudo LMU est requis."); return; }
    if (!discordId) { setError("Le Discord ID est requis."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          discordUsername: newDiscordUsername.trim() || null,
          discordId,
          teamId: newTeamId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur serveur."); return; }
      setPlayers((prev) =>
        [...prev, { ...data, categories: [] }].sort((a, b) =>
          a.username.localeCompare(b.username)
        )
      );
      setNewUsername(""); setNewDiscordUsername(""); setNewDiscordId(""); setNewTeamId("");
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  async function deletePlayer(id: string, username: string) {
    if (!confirm(`Supprimer le pilote "${username}" ?`)) return;
    await fetch(`/api/admin/players/${id}`, { method: "DELETE" });
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }

  async function saveEdit(id: string) {
    const username = editUsername.trim();
    if (!username) { setError("Le Pseudo LMU ne peut pas être vide."); return; }
    setError("");
    const [patchRes, catRes] = await Promise.all([
      fetch(`/api/admin/players/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          discordUsername: editDiscordUsername.trim() || null,
          discordId: editDiscordId || null,
          teamId: editTeamId || null,
          reputation: editReputation,
          xp: editXp,
          money: editMoney,
          licensePoints: editLicensePoints,
          totalRaces: editTotalRaces,
          finishedRaces: editFinishedRaces,
          cleanRaces: editCleanRaces,
        }),
      }),
      fetch(`/api/admin/players/${id}/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds: editCategoryIds }),
      }),
    ]);
    if (!patchRes.ok) {
      const data = await patchRes.json();
      setError(data.error ?? "Erreur lors de la sauvegarde.");
      return;
    }
    const updated = await patchRes.json();
    void catRes;
    const newCategories = categories
      .filter((c) => editCategoryIds.includes(c.id))
      .map((c) => ({ category: c }));
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...updated, categories: newCategories } : p))
    );
    setEditingId(null);
  }

  function startEdit(player: Player) {
    setEditingId(player.id);
    setEditUsername(player.username);
    setEditDiscordUsername(player.discordUsername ?? "");
    setEditDiscordId(player.discordId ?? "");
    setEditTeamId(player.team?.id ?? "");
    setEditReputation(player.reputation);
    setEditXp(player.xp);
    setEditMoney(player.money);
    setEditLicensePoints(player.licensePoints ?? 0);
    setEditTotalRaces(player.totalRaces ?? 0);
    setEditFinishedRaces(player.finishedRaces);
    setEditCleanRaces(player.cleanRaces);
    setEditCategoryIds(player.categories.map((pc) => pc.category.id));
    setError("");
  }

  const inputCls = "w-full bg-brand-surface border border-brand-border rounded-lg px-3 py-2 text-brand-text text-sm focus:outline-none focus:border-brand-orange";
  const numInputCls = inputCls + " font-mono";
  const addInputCls = "bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-orange text-sm";

  return (
    <div className="space-y-6">
      {/* ── Add form ── */}
      <form onSubmit={addPlayer} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-brand-muted block mb-1">Pseudo LMU <span className="text-brand-orange">*</span></label>
            <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
              placeholder="ex: Romain Roussel" className={addInputCls + " w-full"} />
          </div>
          <div>
            <label className="text-xs text-brand-muted block mb-1">Pseudo Discord</label>
            <input type="text" value={newDiscordUsername} onChange={(e) => setNewDiscordUsername(e.target.value)}
              placeholder="ex: douze_" className={addInputCls + " w-full"} />
          </div>
          <div>
            <label className="text-xs text-brand-muted block mb-1">Discord ID <span className="text-brand-orange">*</span></label>
            <input type="text" value={newDiscordId} onChange={(e) => setNewDiscordId(e.target.value)}
              placeholder="ex: 123456789012345678" className={addInputCls + " w-full"} />
          </div>
          <div>
            <label className="text-xs text-brand-muted block mb-1">Écurie</label>
            <select value={newTeamId} onChange={(e) => setNewTeamId(e.target.value)} className={addInputCls + " w-full"}>
              <option value="">Sans écurie</option>
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="submit" disabled={loading || !newUsername.trim() || !newDiscordId.trim()}
            className="px-5 py-2.5 rounded-lg bg-brand-orange hover:bg-brand-orange/80 text-white font-semibold transition-colors disabled:opacity-50 text-sm">
            + Ajouter le pilote
          </button>
          <p className="text-xs text-brand-muted">* champs obligatoires</p>
        </div>
      </form>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* ── Player list ── */}
      {players.length === 0 ? (
        <p className="text-brand-muted text-sm">Aucun pilote pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {players.map((player) => (
            <div key={player.id} className="bg-brand-dark border border-brand-border rounded-xl p-4">
              {editingId === player.id ? (
                <div className="space-y-5">

                  {/* ── Section identité ── */}
                  <div>
                    <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">Identité</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-brand-muted block mb-1">Pseudo LMU ✏️</label>
                        <input type="text" value={editUsername} onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full bg-brand-surface border border-brand-orange/50 rounded-lg px-3 py-2 text-white font-heading font-bold text-sm focus:outline-none focus:border-brand-orange" />
                      </div>
                      <div>
                        <label className="text-xs text-brand-muted block mb-1">Pseudo Discord</label>
                        <input type="text" value={editDiscordUsername} onChange={(e) => setEditDiscordUsername(e.target.value)}
                          placeholder="ex: douze_" className={inputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-brand-muted block mb-1">Discord ID</label>
                        <input type="text" value={editDiscordId} onChange={(e) => setEditDiscordId(e.target.value)}
                          className={inputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-brand-muted block mb-1">Écurie</label>
                        <select value={editTeamId} onChange={(e) => setEditTeamId(e.target.value)} className={inputCls}>
                          <option value="">Sans écurie</option>
                          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* ── Section stats ── */}
                  <div>
                    <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">Statistiques</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-xs text-brand-muted block mb-1">XP <span className="text-brand-orange">🏆</span></label>
                        <input type="number" min={0} value={editXp}
                          onChange={(e) => setEditXp(Math.max(0, Number(e.target.value)))}
                          className={numInputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-brand-muted block mb-1">Argent 💰</label>
                        <input type="number" min={0} value={editMoney}
                          onChange={(e) => setEditMoney(Math.max(0, Number(e.target.value)))}
                          className={numInputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-brand-muted block mb-1">Réputation (0–100)</label>
                        <input type="number" min={0} max={100} value={editReputation}
                          onChange={(e) => setEditReputation(Math.max(0, Math.min(100, Number(e.target.value))))}
                          className={numInputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-brand-muted block mb-1">Points licence</label>
                        <input type="number" min={0} value={editLicensePoints}
                          onChange={(e) => setEditLicensePoints(Math.max(0, Number(e.target.value)))}
                          className={numInputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-brand-muted block mb-1">Total courses</label>
                        <input type="number" min={0} value={editTotalRaces}
                          onChange={(e) => setEditTotalRaces(Math.max(0, Number(e.target.value)))}
                          className={numInputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-brand-muted block mb-1">Courses terminées</label>
                        <input type="number" min={0} value={editFinishedRaces}
                          onChange={(e) => setEditFinishedRaces(Math.max(0, Number(e.target.value)))}
                          className={numInputCls} />
                      </div>
                      <div>
                        <label className="text-xs text-brand-muted block mb-1">Courses clean ✨</label>
                        <input type="number" min={0} value={editCleanRaces}
                          onChange={(e) => setEditCleanRaces(Math.max(0, Number(e.target.value)))}
                          className={numInputCls} />
                      </div>
                    </div>

                    {/* Clean rate preview */}
                    {editFinishedRaces > 0 && (
                      <p className="text-xs text-brand-muted mt-2">
                        Taux propre calculé :{" "}
                        <span className={`font-semibold ${
                          Math.round((editCleanRaces / editFinishedRaces) * 100) >= 80
                            ? "text-green-400"
                            : Math.round((editCleanRaces / editFinishedRaces) * 100) >= 50
                            ? "text-yellow-400"
                            : "text-red-400"
                        }`}>
                          {Math.round(Math.min(editCleanRaces, editFinishedRaces) / editFinishedRaces * 100)}%
                        </span>
                      </p>
                    )}
                  </div>

                  {/* ── Section catégories ── */}
                  {categories.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-3">Catégories</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => {
                          const checked = editCategoryIds.includes(cat.id);
                          return (
                            <button key={cat.id} type="button"
                              onClick={() =>
                                setEditCategoryIds((prev) =>
                                  checked ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]
                                )
                              }
                              className={`px-3 py-1 rounded-lg text-sm font-bold border transition-colors ${
                                checked
                                  ? "bg-brand-orange/10 border-brand-orange text-brand-orange"
                                  : "bg-transparent border-brand-border text-brand-muted hover:border-brand-text"
                              }`}>
                              {checked ? "✓ " : ""}{cat.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t border-brand-border">
                    <button onClick={() => saveEdit(player.id)}
                      className="px-4 py-1.5 rounded-lg bg-brand-orange text-white text-sm font-semibold">
                      Enregistrer
                    </button>
                    <button onClick={() => { setEditingId(null); setError(""); }}
                      className="px-4 py-1.5 rounded-lg border border-brand-border text-brand-muted text-sm">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Read view ── */
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading font-bold text-white">{player.username.toUpperCase()}</span>
                      {player.discordUsername && (
                        <span className="text-xs text-brand-muted">@{player.discordUsername}</span>
                      )}
                      {player.team && <span className="text-xs text-brand-muted">· {player.team.name}</span>}
                      {player.categories.map((pc) => (
                        <span key={pc.category.id} className="text-xs px-1.5 py-0.5 rounded bg-brand-orange/10 text-brand-orange border border-brand-orange/30 font-bold">
                          {pc.category.name}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-brand-muted">
                      <span className="text-brand-orange font-semibold">{player.xp.toLocaleString("fr-FR")} XP</span>
                      <span>{player.money.toLocaleString("fr-FR")} 💰</span>
                      <span>Réputation : {player.reputation}/100</span>
                      <span>{player.finishedRaces} courses</span>
                      <span>
                        Clean :{" "}
                        <span className={
                          player.finishedRaces > 0 && Math.round((player.cleanRaces / player.finishedRaces) * 100) >= 80
                            ? "text-green-400"
                            : player.finishedRaces > 0 && Math.round((player.cleanRaces / player.finishedRaces) * 100) >= 50
                            ? "text-yellow-400"
                            : "text-red-400"
                        }>
                          {player.finishedRaces > 0
                            ? `${Math.round((player.cleanRaces / player.finishedRaces) * 100)}%`
                            : "—"}
                        </span>
                      </span>
                      {player.discordId && <span className="opacity-60">ID: {player.discordId}</span>}
                    </div>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button onClick={() => startEdit(player)} className="text-xs text-brand-muted hover:text-white transition-colors">Modifier</button>
                    <button onClick={() => deletePlayer(player.id, player.username)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Supprimer</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
