"use client";

import { useState } from "react";

interface ResetAction {
  key: "all" | "players" | "ladder" | "season";
  label: string;
  description: string;
  detail: string[];
  color: "red" | "orange" | "blue" | "purple";
  confirmWord: string;
}

const ACTIONS: ResetAction[] = [
  {
    key: "all",
    label: "RESET ALL",
    description: "Vide intégralement la base de données de jeu.",
    detail: [
      "Supprime tous les pilotes et écuries",
      "Supprime tous les résultats et sessions",
      "Supprime l'historique des courses",
      "Supprime les records et classements constructeurs",
    ],
    color: "red",
    confirmWord: "RESET",
  },
  {
    key: "players",
    label: "Reset données pilotes",
    description: "Remet les stats de tous les pilotes à zéro sans supprimer les fiches.",
    detail: [
      "XP, Argent, Réputation → valeurs initiales",
      "Nombre de courses → 0",
      "Résultats et sessions supprimés",
      "Classement constructeurs remis à zéro",
      "Les fiches pilotes restent présentes",
    ],
    color: "orange",
    confirmWord: "PILOTES",
  },
  {
    key: "ladder",
    label: "Reset Classement",
    description: "Remet les points de classement à 0 pour toutes les classes.",
    detail: [
      "Points classement → 0 pour chaque pilote/classe",
      "XP, argent, réputation et historique conservés",
    ],
    color: "blue",
    confirmWord: "CLASSEMENT",
  },
  {
    key: "season",
    label: "Réinit. Saison",
    description: "Réinitialise le ladder et ramène l'XP de classe au plancher du tier actuel.",
    detail: [
      "Points classement → 0 pour chaque pilote/classe",
      "XP de classe → minimum du tier actuel (ex : Gold 2345 XP → 2000 XP)",
      "Argent, réputation, historique et résultats conservés",
      "Le tier (Bronze/Silver/Gold…) ne change pas",
    ],
    color: "purple",
    confirmWord: "SAISON",
  },
];

const COLOR = {
  red:    { border: "border-red-500/40",    bg: "bg-red-500/10",    badge: "bg-red-500/20 text-red-400 border-red-500/30",       btn: "bg-red-600 hover:bg-red-500",       ring: "ring-red-500/30" },
  orange: { border: "border-orange-500/40", bg: "bg-orange-500/10", badge: "bg-orange-500/20 text-orange-400 border-orange-500/30", btn: "bg-orange-600 hover:bg-orange-500", ring: "ring-orange-500/30" },
  blue:   { border: "border-blue-500/40",   bg: "bg-blue-500/10",   badge: "bg-blue-500/20 text-blue-400 border-blue-500/30",     btn: "bg-blue-600 hover:bg-blue-500",     ring: "ring-blue-500/30" },
  purple: { border: "border-purple-500/40", bg: "bg-purple-500/10", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30", btn: "bg-purple-600 hover:bg-purple-500", ring: "ring-purple-500/30" },
};

export default function ResetPage() {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  async function handleReset(action: ResetAction) {
    if (inputVal.trim().toUpperCase() !== action.confirmWord) return;
    setLoading(action.key);
    try {
      const res = await fetch(`/api/admin/reset?action=${action.key}`, { method: "POST" });
      const data = await res.json();
      setResults((prev) => ({
        ...prev,
        [action.key]: res.ok
          ? { ok: true, msg: "Réinitialisation effectuée avec succès." }
          : { ok: false, msg: data.error ?? "Erreur inconnue." },
      }));
    } catch {
      setResults((prev) => ({
        ...prev,
        [action.key]: { ok: false, msg: "Erreur réseau." },
      }));
    } finally {
      setLoading(null);
      setConfirming(null);
      setInputVal("");
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">Réinitialisation</h1>
        <p className="text-brand-muted mt-1">
          Actions irréversibles — une confirmation est requise pour chaque opération.
        </p>
      </div>

      <div className="space-y-4">
        {ACTIONS.map((action) => {
          const c = COLOR[action.color];
          const isConfirming = confirming === action.key;
          const result = results[action.key];
          const isLoading = loading === action.key;
          const canConfirm = inputVal.trim().toUpperCase() === action.confirmWord;

          return (
            <div key={action.key} className={`rounded-xl border ${c.border} ${c.bg} p-5`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${c.badge}`}>
                      {action.key.toUpperCase()}
                    </span>
                  </div>
                  <h2 className="text-white font-bold text-lg">{action.label}</h2>
                  <p className="text-brand-muted text-sm mt-0.5">{action.description}</p>
                  <ul className="mt-2 space-y-0.5">
                    {action.detail.map((d) => (
                      <li key={d} className="text-xs text-brand-muted flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0">•</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                </div>

                {!isConfirming && (
                  <button
                    onClick={() => { setConfirming(action.key); setInputVal(""); }}
                    className={`shrink-0 px-4 py-2 rounded-lg text-white font-bold text-sm transition-colors ${c.btn}`}
                  >
                    {action.label}
                  </button>
                )}
              </div>

              {isConfirming && (
                <div className={`mt-4 pt-4 border-t ${c.border}`}>
                  <p className="text-sm text-white font-medium mb-2">
                    Tapez <code className={`px-1.5 py-0.5 rounded text-xs font-mono ring-1 ${c.ring} ${c.bg}`}>{action.confirmWord}</code> pour confirmer :
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && canConfirm) handleReset(action); }}
                      placeholder={action.confirmWord}
                      autoFocus
                      className="flex-1 px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-white text-sm font-mono focus:outline-none focus:border-red-500 placeholder:text-brand-muted/40"
                    />
                    <button
                      onClick={() => handleReset(action)}
                      disabled={!canConfirm || isLoading}
                      className={`px-4 py-2 rounded-lg text-white font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${c.btn}`}
                    >
                      {isLoading ? "…" : "Confirmer"}
                    </button>
                    <button
                      onClick={() => { setConfirming(null); setInputVal(""); }}
                      className="px-3 py-2 rounded-lg border border-brand-border text-brand-muted hover:text-white text-sm transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}

              {result && (
                <div className={`mt-3 text-xs font-medium px-3 py-2 rounded-lg ${result.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                  {result.ok ? "✓ " : "✕ "}{result.msg}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
