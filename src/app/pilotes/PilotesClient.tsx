"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { formatPilotName } from "@/lib/format";

type PiloteData = {
  id: string;
  username: string;
  xp: number;
  reputation: number;
  finishedRaces: number;
  cleanRaces: number;
  teamName: string | null;
  tier: { name: string; color: string };
};

type SortMode = "xp" | "alpha";

export function PilotesClient({ pilotes }: { pilotes: PiloteData[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("xp");

  const filtered = useMemo(() => {
    let result = pilotes;

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) => p.username.toLowerCase().includes(q));
    }

    if (sort === "alpha") {
      result = [...result].sort((a, b) => a.username.localeCompare(b.username, "fr"));
    }

    return result;
  }, [pilotes, search, sort]);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un pilote…"
          className="flex-1 bg-brand-surface border border-brand-border rounded-lg px-4 py-2.5 text-white placeholder-brand-muted focus:outline-none focus:border-brand-orange/60 transition-colors"
        />
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setSort("xp")}
            className={`px-4 py-2.5 rounded-lg border font-heading font-bold text-sm transition-all ${
              sort === "xp"
                ? "bg-brand-orange text-white border-brand-orange"
                : "bg-brand-surface border-brand-border text-brand-muted hover:border-brand-orange/50 hover:text-white"
            }`}
          >
            Par XP
          </button>
          <button
            onClick={() => setSort("alpha")}
            className={`px-4 py-2.5 rounded-lg border font-heading font-bold text-sm transition-all ${
              sort === "alpha"
                ? "bg-brand-orange text-white border-brand-orange"
                : "bg-brand-surface border-brand-border text-brand-muted hover:border-brand-orange/50 hover:text-white"
            }`}
          >
            A → Z
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-24 text-brand-muted">
          <p className="text-5xl mb-4">🏎️</p>
          <p>Aucun pilote ne correspond à votre recherche.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((player, idx) => {
            const cleanRate =
              player.finishedRaces > 0
                ? Math.round((player.cleanRaces / player.finishedRaces) * 100)
                : 0;

            return (
              <Link
                key={player.id}
                href={`/pilotes/${encodeURIComponent(player.username)}`}
                className="group bg-brand-surface border border-brand-border rounded-xl p-5 hover:border-brand-orange/50 hover:bg-brand-surface/80 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-brand-dark border border-brand-border flex items-center justify-center text-white font-bold font-heading text-lg">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-white truncate group-hover:text-brand-orange transition-colors">
                      {formatPilotName(player.username).toUpperCase()}
                    </p>
                    <p className="text-xs text-brand-muted truncate">
                      {player.teamName ?? "Sans écurie"}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-xs font-bold px-2 py-0.5 rounded"
                    style={{
                      color: player.tier.color,
                      border: `1px solid ${player.tier.color}40`,
                      background: `${player.tier.color}15`,
                    }}
                  >
                    {player.tier.name.toUpperCase()}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-brand-orange font-bold font-heading text-lg">
                      {player.xp.toLocaleString("fr-FR")}
                    </p>
                    <p className="text-brand-muted text-xs">XP</p>
                  </div>
                  <div>
                    <p className="text-white font-bold font-heading text-lg">
                      {player.reputation}
                    </p>
                    <p className="text-brand-muted text-xs">Réputation</p>
                  </div>
                  <div>
                    <p className="text-white font-bold font-heading text-lg">{cleanRate}%</p>
                    <p className="text-brand-muted text-xs">Propre</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
