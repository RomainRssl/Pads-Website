"use client";

import { useState } from "react";

interface Team { id: string; name: string; }
interface ClassStat { id: string; carClass: string; classXp: number; ladderPoints: number; }
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
  classStats: ClassStat[];
}

interface Props {
  initialPlayers: Player[];
}

// ── Sélecteur de fiche avec filtre texte ──────────────────────────────────────

function PlayerPicker({
  label, hint, players, value, excludeId, onChange,
}: {
  label: string;
  hint: string;
  players: Player[];
  value: string;
  excludeId?: string;
  onChange: (id: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const visible = players.filter(
    (p) =>
      p.id !== excludeId &&
      (filter.trim() === "" ||
        p.username.toLowerCase().includes(filter.trim().toLowerCase()) ||
        (p.discordUsername ?? "").toLowerCase().includes(filter.trim().toLowerCase()))
  );
  const inputCls = "w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-brand-text text-sm focus:outline-none focus:border-brand-orange";

  return (
    <div>
      <label className="text-xs font-semibold text-brand-muted uppercase tracking-wider block mb-1">{label}</label>
      <p className="text-xs text-brand-muted mb-2">{hint}</p>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrer par pseudo…"
        className={inputCls + " mb-2"}
      />
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">— Choisir une fiche —</option>
        {visible.map((p) => (
          <option key={p.id} value={p.id}>
            {p.username}{p.discordUsername ? ` (@${p.discordUsername})` : ""} — {p.finishedRaces} courses
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Carte récap d'une fiche ───────────────────────────────────────────────────

function PlayerCard({ player, badge, badgeCls }: { player: Player; badge: string; badgeCls: string }) {
  return (
    <div className="bg-brand-dark border border-brand-border rounded-xl p-4">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${badgeCls}`}>{badge}</span>
        <span className="font-heading font-bold text-white">{player.username.toUpperCase()}</span>
        {player.discordUsername && <span className="text-xs text-brand-muted">@{player.discordUsername}</span>}
        {player.team && <span className="text-xs text-brand-muted">· {player.team.name}</span>}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted">
        <span className="text-brand-orange font-semibold">{player.xp.toLocaleString("fr-FR")} XP</span>
        <span>{player.money.toLocaleString("fr-FR")} 💰</span>
        <span>Réputation : {player.reputation}/100</span>
        <span>{player.totalRaces} courses ({player.cleanRaces} clean)</span>
        {player.discordId && <span className="opacity-60">Discord ID : {player.discordId}</span>}
      </div>
      {player.classStats.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {player.classStats.map((s) => (
            <span key={s.id} className="text-xs px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-muted">
              {s.carClass} : <span className="text-brand-text font-mono">{s.ladderPoints} pts</span> · {s.classXp} XP
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function PlayerMergeManager({ initialPlayers }: Props) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [targetId, setTargetId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [keepUsername, setKeepUsername] = useState<"target" | "source">("target");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const target = players.find((p) => p.id === targetId) ?? null;
  const source = players.find((p) => p.id === sourceId) ?? null;

  // Aperçu de la fiche fusionnée
  const preview = target && source ? {
    username: keepUsername === "source" ? source.username : target.username,
    xp: target.xp + source.xp,
    money: target.money + source.money,
    reputation: Math.max(0, Math.min(100, target.reputation + (source.reputation - 50))),
    totalRaces: target.totalRaces + source.totalRaces,
    cleanRaces: target.cleanRaces + source.cleanRaces,
    classStats: (() => {
      const map = new Map<string, { classXp: number; ladderPoints: number }>();
      for (const s of [...target.classStats, ...source.classStats]) {
        const cur = map.get(s.carClass) ?? { classXp: 0, ladderPoints: 0 };
        map.set(s.carClass, {
          classXp: cur.classXp + s.classXp,
          ladderPoints: cur.ladderPoints + s.ladderPoints,
        });
      }
      return Array.from(map.entries()).map(([carClass, v]) => ({ carClass, ...v }));
    })(),
  } : null;

  async function merge() {
    if (!target || !source || !preview) return;
    if (!confirm(
      `Fusionner "${source.username}" dans "${target.username}" ?\n\n` +
      `• La fiche "${source.username}" sera SUPPRIMÉE définitivement\n` +
      `• Toutes ses courses et statistiques seront transférées\n` +
      `• Pseudo conservé : "${preview.username}"\n\n` +
      `Cette action est irréversible.`
    )) return;

    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/players/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId: target.id, sourceId: source.id, keepUsername }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur serveur."); return; }
      setPlayers((prev) =>
        prev
          .filter((p) => p.id !== source.id)
          .map((p) => (p.id === target.id ? { ...p, ...data } : p))
          .sort((a, b) => a.username.localeCompare(b.username))
      );
      setSuccess(`Fiches fusionnées : "${source.username}" a été absorbée par "${data.username}".`);
      setTargetId("");
      setSourceId("");
      setKeepUsername("target");
    } catch {
      setError("Erreur réseau. Vérifiez votre connexion et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Sélection des deux fiches ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PlayerPicker
          label="Fiche conservée"
          hint="La fiche d'origine, qui reçoit tout l'historique."
          players={players}
          value={targetId}
          excludeId={sourceId}
          onChange={(id) => { setTargetId(id); setSuccess(""); }}
        />
        <PlayerPicker
          label="Doublon à fusionner"
          hint="La fiche créée par erreur — elle sera supprimée."
          players={players}
          value={sourceId}
          excludeId={targetId}
          onChange={(id) => { setSourceId(id); setSuccess(""); }}
        />
      </div>

      {/* ── Récap des fiches sélectionnées ── */}
      {(target || source) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {target ? (
            <PlayerCard player={target} badge="CONSERVÉE" badgeCls="bg-green-500/10 border-green-500/40 text-green-400" />
          ) : <div />}
          {source && (
            <PlayerCard player={source} badge="SUPPRIMÉE" badgeCls="bg-red-500/10 border-red-500/40 text-red-400" />
          )}
        </div>
      )}

      {/* ── Choix du pseudo + aperçu ── */}
      {target && source && preview && (
        <>
          <div>
            <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-1">Pseudo à conserver</p>
            <p className="text-xs text-brand-muted mb-3">
              Choisissez le pseudo <strong className="text-brand-text">actuellement utilisé en jeu</strong> —
              sinon une nouvelle fiche doublon sera recréée à la prochaine course.
            </p>
            <div className="flex flex-wrap gap-2">
              {([["target", target.username], ["source", source.username]] as const).map(([key, name]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setKeepUsername(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                    keepUsername === key
                      ? "bg-brand-orange/10 border-brand-orange text-brand-orange"
                      : "bg-transparent border-brand-border text-brand-muted hover:border-brand-text"
                  }`}
                >
                  {keepUsername === key ? "✓ " : ""}{name}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-brand-dark border border-brand-orange/40 rounded-xl p-4">
            <p className="text-xs font-semibold text-brand-orange uppercase tracking-wider mb-2">Aperçu après fusion</p>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-heading font-bold text-white">{preview.username.toUpperCase()}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-brand-muted">
              <span className="text-brand-orange font-semibold">{preview.xp.toLocaleString("fr-FR")} XP</span>
              <span>{preview.money.toLocaleString("fr-FR")} 💰</span>
              <span>Réputation : {preview.reputation}/100</span>
              <span>{preview.totalRaces} courses ({preview.cleanRaces} clean)</span>
            </div>
            {preview.classStats.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {preview.classStats.map((s) => (
                  <span key={s.carClass} className="text-xs px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-muted">
                    {s.carClass} : <span className="text-brand-text font-mono">{s.ladderPoints} pts</span> · {s.classXp} XP
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={merge}
            disabled={loading}
            className="px-5 py-2.5 rounded-lg bg-brand-orange hover:bg-brand-orange/80 text-white font-semibold transition-colors disabled:opacity-50 text-sm"
          >
            {loading ? "Fusion en cours…" : "🔀 Fusionner les fiches"}
          </button>
        </>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}
    </div>
  );
}
