"use client";

import { useState, useRef } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

interface RaceMeta {
  trackVenue?: string;
  trackEvent?: string;
  trackLengthM?: number;
  raceTimeMin?: number;
  dateString?: string;
  sessionType?: "Race" | "Qualification" | "Practice" | "Unknown";
}

interface PreviewEntry {
  username: string;
  position: number;
  isClean: boolean;
  xpGained: number;
  moneyGained: number;
  foundInDb: boolean;
  // Extended XML fields
  carClass?: string;
  carNumber?: string;
  teamName?: string;
  laps?: number;
  bestLapTimeSec?: number | null;
  finishStatus?: string;
}

interface ProcessResult {
  updatedPlayers: number;
  totalPlayers: number;
  skipped: number;
}

type Step = "upload" | "preview" | "done";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatLapTime(sec: number | null | undefined): string {
  if (sec == null || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toFixed(3).padStart(6, "0");
  return `${m}:${s}`;
}

function formatDate(raw: string | undefined): string {
  if (!raw) return "—";
  // "2026/04/17 21:08:59" → "17 avr. 2026 à 21:08"
  try {
    const d = new Date(raw.replace(/\//g, "-"));
    return d.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return raw;
  }
}

function sessionLabel(type: RaceMeta["sessionType"]): string {
  if (type === "Race") return "Course";
  if (type === "Qualification") return "Qualification";
  if (type === "Practice") return "Essais libres";
  return "Session";
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResultsUploadForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [duration, setDuration] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewEntry[]>([]);
  const [meta, setMeta] = useState<RaceMeta>({});
  const [durationUsed, setDurationUsed] = useState<number>(0);
  const [durationAutoDetected, setDurationAutoDetected] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isXml = file?.name.toLowerCase().endsWith(".xml") ?? false;

  function reset() {
    setStep("upload");
    setPreview([]);
    setMeta({});
    setResult(null);
    setError(null);
    setFile(null);
    setDuration("");
    setDurationUsed(0);
    setDurationAutoDetected(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handlePreview(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Sélectionnez un fichier."); return; }
    if (!isXml && (!duration || parseInt(duration) <= 0)) {
      setError("Entrez une durée valide."); return;
    }

    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    if (duration) fd.append("duration", duration);

    try {
      const res = await fetch("/api/admin/results/preview", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur serveur.");
      setPreview(data.preview);
      setMeta(data.meta ?? {});
      setDurationUsed(data.durationMin);
      setDurationAutoDetected(data.durationAutoDetected ?? false);
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
    fd.append("duration", String(durationUsed));

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
            Durée de la course (minutes)
            {isXml ? (
              <span className="ml-2 text-brand-muted font-normal text-xs">optionnel — auto-détectée depuis le XML</span>
            ) : (
              <span className="text-brand-red"> *</span>
            )}
          </label>
          <input
            id="duration"
            type="number"
            min="1"
            max="480"
            value={duration}
            onChange={(e) => { setDuration(e.target.value); setError(null); }}
            placeholder={isXml ? "Laisser vide = depuis le XML" : "ex : 45"}
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
          <p><span className="text-brand-text">XML :</span> Fichier de résultats Le Mans Ultimate (dossier Results/) — circuit, positions, temps inclus</p>
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
    const hasExtended = preview.some((e) => e.carClass !== undefined);

    // Unique car classes for the meta card
    const classes = [...new Set(preview.map((e) => e.carClass).filter(Boolean))];

    // XP totals
    const totalXp = preview.filter((e) => e.foundInDb).reduce((s, e) => s + e.xpGained, 0);
    const leader = [...preview].sort((a, b) => a.position - b.position)[0];

    return (
      <div className="space-y-6">
        {error && <ErrorBanner message={error} />}

        {/* ── Race summary card ── */}
        <div className="bg-brand-dark border border-brand-border rounded-xl overflow-hidden">
          {/* Accent bar */}
          <div className="h-1 bg-gradient-to-r from-brand-red via-brand-red/60 to-transparent" />

          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              {/* Left: track + event */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-brand-red font-bold text-xs uppercase tracking-wider">
                    {sessionLabel(meta.sessionType)}
                  </span>
                  {classes.length > 0 && (
                    <div className="flex gap-1.5">
                      {classes.map((cls) => (
                        <span key={cls} className="text-xs px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-muted font-mono">
                          {cls}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <h2 className="font-heading text-xl font-bold text-white">
                  {meta.trackVenue ?? "Circuit inconnu"}
                </h2>
                {meta.trackEvent && (
                  <p className="text-brand-muted text-sm mt-0.5">{meta.trackEvent}</p>
                )}
              </div>

              {/* Right: stats pills */}
              <div className="flex flex-wrap gap-3 text-sm">
                <InfoPill icon="📅" label={formatDate(meta.dateString)} />
                <InfoPill
                  icon="⏱"
                  label={`${durationUsed} min${durationAutoDetected ? " (XML)" : ""}`}
                />
                {meta.trackLengthM && (
                  <InfoPill icon="📏" label={`${(meta.trackLengthM / 1000).toFixed(3)} km`} />
                )}
                <InfoPill icon="🏎️" label={`${preview.length} pilotes`} />
              </div>
            </div>

            {/* XP summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-brand-border">
              <MiniStat label="Détectés" value={preview.length} color="text-white" />
              <MiniStat label="Seront mis à jour" value={found} color="text-green-400" />
              {skipped > 0 && <MiniStat label="Inconnus" value={skipped} color="text-yellow-400" />}
              <MiniStat label="XP distribués" value={`${totalXp.toLocaleString("fr-FR")}`} color="text-brand-red" />
              {leader && (
                <MiniStat label="Vainqueur" value={leader.username} color="text-yellow-300" />
              )}
            </div>
          </div>
        </div>

        {/* ── Detailed standings ── */}
        <div className="overflow-x-auto rounded-xl border border-brand-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border bg-brand-surface">
                <Th>Pos</Th>
                <Th>Pilote</Th>
                {hasExtended && <Th>Classe</Th>}
                {hasExtended && <Th>Tours</Th>}
                {hasExtended && <Th>Meilleur temps</Th>}
                {hasExtended && <Th>Arrivée</Th>}
                <Th>XP gagné</Th>
                <Th>Argent</Th>
                <Th>Propre</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody>
              {[...preview]
                .sort((a, b) => a.position - b.position)
                .map((entry) => {
                  const isDnf = entry.finishStatus && entry.finishStatus !== "Finished Normally";
                  return (
                    <tr
                      key={entry.username}
                      className={`border-b border-brand-border last:border-0 transition-colors ${
                        entry.foundInDb ? "hover:bg-brand-surface/50" : "opacity-50"
                      } ${isDnf ? "bg-red-500/5" : ""}`}
                    >
                      {/* Pos */}
                      <td className="px-4 py-3 font-bold text-brand-text text-center whitespace-nowrap">
                        {entry.position === 1 ? "🥇" : entry.position === 2 ? "🥈" : entry.position === 3 ? "🥉" : `#${entry.position}`}
                      </td>

                      {/* Pilote */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-brand-text whitespace-nowrap">{entry.username}</p>
                        {entry.teamName && (
                          <p className="text-xs text-brand-muted truncate max-w-[180px]">{entry.teamName}</p>
                        )}
                      </td>

                      {/* Classe */}
                      {hasExtended && (
                        <td className="px-4 py-3">
                          {entry.carClass && (
                            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-muted">
                              {entry.carClass}
                            </span>
                          )}
                        </td>
                      )}

                      {/* Tours */}
                      {hasExtended && (
                        <td className="px-4 py-3 text-brand-text text-center">
                          {entry.laps ?? "—"}
                        </td>
                      )}

                      {/* Meilleur temps */}
                      {hasExtended && (
                        <td className="px-4 py-3 font-mono text-brand-text whitespace-nowrap">
                          {formatLapTime(entry.bestLapTimeSec)}
                        </td>
                      )}

                      {/* Arrivée */}
                      {hasExtended && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isDnf ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold">
                              DNF
                            </span>
                          ) : entry.finishStatus ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">
                              Classé
                            </span>
                          ) : null}
                        </td>
                      )}

                      {/* XP */}
                      <td className="px-4 py-3 font-semibold text-brand-red whitespace-nowrap">
                        +{entry.xpGained.toLocaleString("fr-FR")} XP
                      </td>

                      {/* Argent */}
                      <td className="px-4 py-3 text-brand-muted whitespace-nowrap">
                        +{entry.moneyGained.toLocaleString("fr-FR")} 💰
                      </td>

                      {/* Propre */}
                      <td className="px-4 py-3">
                        {entry.isClean
                          ? <span className="text-green-400 text-xs">✨ Oui</span>
                          : <span className="text-brand-muted text-xs">—</span>}
                      </td>

                      {/* Statut DB */}
                      <td className="px-4 py-3">
                        {entry.foundInDb ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 border border-green-500/30 text-green-400">Trouvé</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">Inconnu</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {skipped > 0 && (
          <p className="text-yellow-400/80 text-sm">
            ⚠️ {skipped} pilote{skipped > 1 ? "s" : ""} introuvable{skipped > 1 ? "s" : ""} en base — créez leur profil dans le panel Joueurs pour qu'ils soient pris en compte.
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
            {loading ? "Sauvegarde…" : `✓ Valider et mettre à jour ${found} profil${found > 1 ? "s" : ""}`}
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
              <p className="text-brand-muted">profils mis à jour</p>
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

// ── Sub-components ────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-4 py-3 font-semibold text-brand-muted whitespace-nowrap text-xs uppercase tracking-wide">
      {children}
    </th>
  );
}

function InfoPill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-brand-muted text-xs">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-lg px-3 py-2">
      <p className={`text-lg font-bold font-heading ${color}`}>{value}</p>
      <p className="text-brand-muted text-xs">{label}</p>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="p-4 rounded-lg bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">
      {message}
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
