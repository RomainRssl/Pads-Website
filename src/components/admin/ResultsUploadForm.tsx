"use client";

import { useState, useRef } from "react";

interface PreviewEntry {
  username: string;
  position: number;
  isClean: boolean;
  xpGained: number;
  moneyGained: number;
  foundInDb: boolean;
}

interface ProcessResult {
  updatedPlayers: number;
  totalPlayers: number;
  skipped: number;
}

type Step = "upload" | "preview" | "done";

export default function ResultsUploadForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [duration, setDuration] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewEntry[]>([]);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep("upload");
    setPreview([]);
    setResult(null);
    setError(null);
    setFile(null);
    setDuration("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Sélectionnez un fichier."); return; }
    if (!duration || parseInt(duration) <= 0) { setError("Entrez une durée valide."); return; }

    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("duration", duration);

    try {
      const res = await fetch("/api/admin/results/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur.");
      setPreview(data.preview);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleProcess() {
    if (!file) return;
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("duration", duration);

    try {
      const res = await fetch("/api/admin/results/process", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur.");
      setResult(data);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  // ── Upload step ─────────────────────────────────────────────────────────────
  if (step === "upload") {
    return (
      <form onSubmit={handlePreview} className="space-y-6 max-w-2xl">
        {error && <ErrorBanner message={error} />}

        <div>
          <label className="block text-sm font-medium text-brand-text mb-1.5">
            Fichier de résultats <span className="text-brand-red">*</span>
            <span className="ml-2 text-brand-muted font-normal">.xml (LMU), .json ou .csv</span>
          </label>
          <div
            className="border-2 border-dashed border-brand-border rounded-xl p-8 text-center cursor-pointer hover:border-brand-red/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileIcon />
                <div className="text-left">
                  <p className="text-brand-text font-medium">{file.name}</p>
                  <p className="text-brand-muted text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={(ev) => { ev.stopPropagation(); setFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="ml-auto text-brand-muted hover:text-brand-red text-xl"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="text-brand-muted">
                <UploadIcon />
                <p className="mt-2 font-medium">Glissez un fichier ou cliquez pour parcourir</p>
                <p className="text-sm mt-1">XML (LMU), JSON ou CSV</p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xml,.json,.csv"
              className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }}
            />
          </div>
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-brand-text mb-1.5">
            Durée de la course (minutes) <span className="text-brand-red">*</span>
          </label>
          <input
            id="duration"
            type="number"
            min="1"
            max="480"
            value={duration}
            onChange={(e) => { setDuration(e.target.value); setError(null); }}
            placeholder="ex : 45"
            className="w-48 px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
          />
          {duration && parseInt(duration) > 0 && (
            <p className="mt-2 text-brand-muted text-sm">
              XP de base : <span className="text-brand-text font-medium">{parseInt(duration) * 10} XP</span> par joueur (avant bonus de position)
            </p>
          )}
        </div>

        <div className="bg-brand-surface border border-brand-border rounded-xl p-4 text-sm text-brand-muted space-y-1">
          <p className="font-medium text-brand-text mb-2">Formats acceptés</p>
          <p><span className="text-brand-text">XML :</span> Fichier de résultats Le Mans Ultimate (dossier Results/)</p>
          <p><span className="text-brand-text">JSON :</span> {`[{"position":1,"username":"Player1","isClean":true}, ...]`}</p>
          <p><span className="text-brand-text">CSV :</span> {`position,username,isClean`} (en-tête obligatoire)</p>
          <p className="text-xs mt-2 text-brand-muted/70">ℹ️ Pour les fichiers XML, le statut &quot;course propre&quot; est activé par défaut — ajustez-le via le panel joueurs si besoin.</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-8 py-3 rounded-lg bg-brand-red hover:bg-brand-red/80 disabled:opacity-50 text-white font-semibold transition-colors"
        >
          {loading ? <Spinner /> : null}
          {loading ? "Analyse en cours…" : "Aperçu des récompenses →"}
        </button>
      </form>
    );
  }

  // ── Preview step ────────────────────────────────────────────────────────────
  if (step === "preview") {
    const found = preview.filter((e) => e.foundInDb).length;
    const skipped = preview.length - found;

    return (
      <div className="space-y-6">
        {error && <ErrorBanner message={error} />}

        {/* Summary bar */}
        <div className="flex flex-wrap gap-4">
          <StatBadge label="Joueurs détectés" value={preview.length} color="text-brand-text" />
          <StatBadge label="Seront mis à jour" value={found} color="text-green-400" />
          {skipped > 0 && <StatBadge label="Ignorés (inconnus)" value={skipped} color="text-yellow-400" />}
          <StatBadge label="Durée" value={`${duration} min`} color="text-brand-muted" />
        </div>

        {/* Results table */}
        <div className="overflow-x-auto rounded-xl border border-brand-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border bg-brand-surface">
                {["Pos", "Pseudo", "Statut", "XP gagné", "Argent", "Propre"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-brand-muted whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview
                .sort((a, b) => a.position - b.position)
                .map((entry) => (
                  <tr
                    key={entry.username}
                    className={`border-b border-brand-border last:border-0 transition-colors ${
                      entry.foundInDb ? "hover:bg-brand-surface/50" : "opacity-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-bold text-brand-text">
                        {entry.position === 1 ? "🥇" : entry.position === 2 ? "🥈" : entry.position === 3 ? "🥉" : `#${entry.position}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-text">{entry.username}</td>
                    <td className="px-4 py-3">
                      {entry.foundInDb ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 border border-green-500/30 text-green-400">Trouvé</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">Inconnu</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-brand-red">+{entry.xpGained} XP</td>
                    <td className="px-4 py-3 text-brand-muted">+{entry.moneyGained} 💰</td>
                    <td className="px-4 py-3">
                      {entry.isClean
                        ? <span className="text-green-400">✨ Oui</span>
                        : <span className="text-brand-muted">—</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {skipped > 0 && (
          <p className="text-yellow-400/80 text-sm">
            ⚠️ {skipped} joueur{skipped > 1 ? "s" : ""} introuvable{skipped > 1 ? "s" : ""} en base — créez leur profil dans le panel Joueurs pour qu'ils soient pris en compte.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleProcess}
            disabled={loading || found === 0}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-brand-red hover:bg-brand-red/80 disabled:opacity-50 text-white font-bold transition-colors"
          >
            {loading ? <Spinner /> : null}
            {loading ? "Sauvegarde…" : "✓ Valider et sauvegarder"}
          </button>
          <button
            onClick={reset}
            disabled={loading}
            className="px-6 py-3 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-text transition-colors"
          >
            ← Modifier
          </button>
        </div>
      </div>
    );
  }

  // ── Done step ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg space-y-6">
      <div className="bg-brand-card border border-green-500/30 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">🏁</div>
        <h2 className="font-heading text-2xl font-bold text-white mb-2">
          Résultats enregistrés !
        </h2>
        <p className="text-brand-muted mb-6">
          La notification Discord a été envoyée automatiquement.
        </p>
        {result && (
          <div className="flex justify-center gap-6 mb-6 text-sm">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{result.updatedPlayers}</p>
              <p className="text-brand-muted">mis à jour</p>
            </div>
            {result.skipped > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{result.skipped}</p>
                <p className="text-brand-muted">ignorés</p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red/80 text-white font-semibold transition-colors"
        >
          Traiter une autre course
        </button>
      </div>
    </div>
  );
}

// ── Small reusable sub-components ───────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-4 rounded-lg bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">
      {message}
    </div>
  );
}

function StatBadge({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg px-4 py-2 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-brand-muted text-xs">{label}</p>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="mx-auto w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="w-8 h-8 text-brand-red shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
