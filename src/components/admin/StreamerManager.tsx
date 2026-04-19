"use client";

import { useState } from "react";

interface Streamer {
  id: string;
  username: string;
  displayName: string | null;
  addedAt: string;
}

interface Props {
  initialStreamers: Streamer[];
}

export default function StreamerManager({ initialStreamers }: Props) {
  const [streamers, setStreamers] = useState<Streamer[]>(initialStreamers);
  const [input, setInput] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/streamers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur inconnue.");
      setStreamers((prev) => [...prev, data]);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Retirer ce streamer de la liste ?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/streamers/${id}`, { method: "DELETE" });
      setStreamers((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(null); }}
            placeholder="Pseudo Twitch (ex : xqc)"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
          />
          {error && <p className="mt-1 text-sm text-brand-red">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={adding || !input.trim()}
          className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red/80 disabled:opacity-50 text-white font-semibold transition-colors shrink-0"
        >
          {adding ? "…" : "+ Ajouter"}
        </button>
      </form>

      {/* Streamers list */}
      {streamers.length === 0 ? (
        <div className="text-center py-10 border border-brand-border rounded-xl text-brand-muted">
          Aucun streamer enregistré. Ajoutez le premier pseudo Twitch.
        </div>
      ) : (
        <div className="rounded-xl border border-brand-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border bg-brand-surface">
                <th className="text-left px-4 py-3 font-semibold text-brand-muted">Login Twitch</th>
                <th className="text-left px-4 py-3 font-semibold text-brand-muted hidden sm:table-cell">Nom affiché</th>
                <th className="text-right px-4 py-3 font-semibold text-brand-muted">Action</th>
              </tr>
            </thead>
            <tbody>
              {streamers.map((s) => (
                <tr key={s.id} className="border-b border-brand-border last:border-0 hover:bg-brand-surface/50">
                  <td className="px-4 py-3">
                    <a
                      href={`https://twitch.tv/${s.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-discord hover:underline"
                    >
                      {s.username}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-brand-muted hidden sm:table-cell">
                    {s.displayName ?? <span className="italic text-brand-muted/60">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id}
                      className="px-3 py-1 rounded-lg text-xs font-medium border border-brand-red/30 text-brand-red hover:bg-brand-red/10 disabled:opacity-50 transition-colors"
                    >
                      {deleting === s.id ? "…" : "Retirer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-brand-muted text-xs">
        💡 Le nom affiché est récupéré automatiquement depuis Twitch si les credentials API sont configurés.
      </p>
    </div>
  );
}
