"use client";

import { useState, useRef, useEffect } from "react";

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
  incidents: number;
  xpGained: number;
  moneyGained: number;
  reputationDelta: number;
  ladderDelta: number;
  foundInDb: boolean;
  willBeCreated?: boolean;
  carClass?: string;
  carNumber?: string;
  teamName?: string;
  laps?: number;
  bestLapTimeSec?: number | null;
  finishStatus?: string;
}

interface Formula {
  // XP
  finishBonus: number;
  positionBase: number;
  positionMultiplier: number;
  podiumP1: number;
  podiumP2: number;
  podiumP3: number;
  incidentMalusPct: number;
  incidentMalusCap: number;
  // Argent (pool)
  moneyBasePerMin: number;
  coeffCourse: number;
  organizerSharePct: number;
  p1PrizePct: number;
  pLastMinPct: number;
  // Réputation (incidents)
  repDelta_01: number;
  repDelta_2: number;
  repDelta_3: number;
  repDelta_4plus: number;
  repFinishBonus: number;
  // Ladder coefficients
  ladderCoeff_sm: number;
  ladderCoeff_md: number;
  ladderCoeff_lg: number;
  // Avertissements & Sanctions
  warningIncidentThresh: number;
  sanctionIncidentThresh: number;
  forceThreshold: number;
}

const DEFAULT_FORMULA: Formula = {
  finishBonus: 10,
  positionBase: 10,
  positionMultiplier: 1.5,
  podiumP1: 10,
  podiumP2: 7,
  podiumP3: 5,
  incidentMalusPct: 2,
  incidentMalusCap: 20,
  moneyBasePerMin: 50,
  coeffCourse: 1.0,
  organizerSharePct: 25,
  p1PrizePct: 10,
  pLastMinPct: 25,
  repDelta_01: 3,
  repDelta_2: 1,
  repDelta_3: -1,
  repDelta_4plus: -3,
  repFinishBonus: 1,
  ladderCoeff_sm: 4,
  ladderCoeff_md: 3,
  ladderCoeff_lg: 2,
  warningIncidentThresh: 4,
  sanctionIncidentThresh: 8,
  forceThreshold: 1500,
};

interface ProcessResult {
  updatedPlayers: number;
  totalPlayers: number;
  skipped: number;
  autoCreated?: number;
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
  try {
    const d = new Date(raw.replace(/\//g, "-"));
    return d.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
  } catch { return raw; }
}

function sessionLabel(type: RaceMeta["sessionType"]): string {
  if (type === "Race") return "Course";
  if (type === "Qualification") return "Qualification";
  if (type === "Practice") return "Essais libres";
  return "Session";
}

function incidentBadge(incidents: number, warnThresh: number, sanctionThresh: number) {
  if (incidents >= sanctionThresh) {
    return <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-400 font-bold">🚫</span>;
  }
  if (incidents >= warnThresh) {
    return <span className="ml-1 text-xs px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-orange-400 font-bold">⚠️</span>;
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResultsUploadForm() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [duration, setDuration] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [formula, setFormula] = useState<Formula>(DEFAULT_FORMULA);
  const [preview, setPreview] = useState<PreviewEntry[]>([]);
  const [meta, setMeta] = useState<RaceMeta>({});
  const [durationUsed, setDurationUsed] = useState<number>(0);
  const [durationAutoDetected, setDurationAutoDetected] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved formula defaults on mount
  useEffect(() => {
    fetch("/api/admin/formula-defaults")
      .then((r) => r.json())
      .then((data) => {
        setFormula((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {/* use defaults on error */});
  }, []);

  const isXml = file?.name.toLowerCase().endsWith(".xml") ?? false;

  function setF<K extends keyof Formula>(key: K, val: number) {
    setFormula((prev) => ({ ...prev, [key]: val }));
  }

  function buildFormData() {
    const fd = new FormData();
    if (file) fd.append("file", file);
    if (duration) fd.append("duration", duration);
    // XP
    fd.append("finishBonus",        String(formula.finishBonus));
    fd.append("positionBase",       String(formula.positionBase));
    fd.append("positionMultiplier", String(formula.positionMultiplier));
    fd.append("podiumP1",           String(formula.podiumP1));
    fd.append("podiumP2",           String(formula.podiumP2));
    fd.append("podiumP3",           String(formula.podiumP3));
    fd.append("incidentMalusPct",   String(formula.incidentMalusPct));
    fd.append("incidentMalusCap",   String(formula.incidentMalusCap));
    // Argent (pool)
    fd.append("moneyBasePerMin",   String(formula.moneyBasePerMin));
    fd.append("coeffCourse",       String(formula.coeffCourse));
    fd.append("organizerSharePct", String(formula.organizerSharePct));
    fd.append("p1PrizePct",        String(formula.p1PrizePct));
    fd.append("pLastMinPct",       String(formula.pLastMinPct));
    // Réputation
    fd.append("repDelta_01",    String(formula.repDelta_01));
    fd.append("repDelta_2",     String(formula.repDelta_2));
    fd.append("repDelta_3",     String(formula.repDelta_3));
    fd.append("repDelta_4plus", String(formula.repDelta_4plus));
    fd.append("repFinishBonus", String(formula.repFinishBonus));
    // Ladder
    fd.append("ladderCoeff_sm", String(formula.ladderCoeff_sm));
    fd.append("ladderCoeff_md", String(formula.ladderCoeff_md));
    fd.append("ladderCoeff_lg", String(formula.ladderCoeff_lg));
    // Avertissements & Sanctions
    fd.append("warningIncidentThresh",  String(formula.warningIncidentThresh));
    fd.append("sanctionIncidentThresh", String(formula.sanctionIncidentThresh));
    fd.append("forceThreshold",         String(formula.forceThreshold));
    return fd;
  }

  async function saveDefaults() {
    try {
      await fetch("/api/admin/formula-defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formula),
      });
    } catch {/* non-blocking */}
  }

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

    try {
      const res = await fetch("/api/admin/results/preview", { method: "POST", body: buildFormData() });
      let data: Record<string, unknown>;
      try { data = await res.json(); }
      catch { throw new Error(`Erreur serveur (${res.status}). Vérifiez les logs du serveur.`); }
      if (!res.ok) throw new Error((data.error as string) ?? "Erreur serveur.");
      setPreview(data.preview as PreviewEntry[]);
      setMeta((data.meta ?? {}) as RaceMeta);
      setDurationUsed(data.durationMin as number);
      setDurationAutoDetected((data.durationAutoDetected ?? false) as boolean);
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

    const fd = buildFormData();
    fd.set("duration", String(durationUsed));

    try {
      const res = await fetch("/api/admin/results/process", { method: "POST", body: fd });
      let data: Record<string, unknown>;
      try { data = await res.json(); }
      catch { throw new Error(`Erreur serveur (${res.status}). Vérifiez les logs du serveur.`); }
      if (!res.ok) throw new Error((data.error as string) ?? "Erreur serveur.");
      setResult(data as unknown as ProcessResult);
      setStep("done");
      // Save formula as new defaults after successful processing
      await saveDefaults();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setLoading(false);
    }
  }

  // ── Upload step ─────────────────────────────────────────────────────────────
  if (step === "upload") {
    const dur = duration ? parseInt(duration) : null;
    const xpP1Preview   = dur != null ? dur + formula.finishBonus + formula.positionBase + formula.podiumP1 : null;
    const xpLastPreview = dur != null ? dur + formula.finishBonus + formula.positionBase : null;

    return (
      <form onSubmit={handlePreview} className="space-y-8">
        {error && <ErrorBanner message={error} />}

        {/* ── XP de classe ── */}
        <div>
          <h3 className="font-heading text-base font-semibold text-white mb-1">XP de classe</h3>
          <p className="text-brand-muted text-xs mb-4">
            XP = durée + finish + [posBase + (N−pos) × mult] + podium · XP final = XP × (1 − malus incidents)
          </p>

          <p className="text-xs text-brand-muted uppercase tracking-wider font-semibold mb-2">Bonus de base</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <FormulaField
              label="Bonus finish"
              value={formula.finishBonus}
              onChange={(v) => setF("finishBonus", v)}
              min={0} max={100} step={1} prefix="+"
              hint="XP plat pour avoir terminé"
            />
            <FormulaField
              label="Base position"
              value={formula.positionBase}
              onChange={(v) => setF("positionBase", v)}
              min={0} max={100} step={1} prefix="+"
              hint="Minimum de bonus de position"
            />
            <FormulaField
              label="Multiplicateur position"
              value={formula.positionMultiplier}
              onChange={(v) => setF("positionMultiplier", v)}
              min={0} max={10} step={0.1} prefix="×"
              hint="× (N − pos) rangs gagnés"
            />
          </div>

          <p className="text-xs text-brand-muted uppercase tracking-wider font-semibold mb-2">Bonus podium 🏆</p>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <FormulaField
              label="P1 🥇"
              value={formula.podiumP1}
              onChange={(v) => setF("podiumP1", v)}
              min={0} max={200} step={1} prefix="+"
              hint={xpP1Preview != null ? `P1 ≈ ${xpP1Preview} XP (0 incident)` : "bonus pour le 1er"}
            />
            <FormulaField
              label="P2 🥈"
              value={formula.podiumP2}
              onChange={(v) => setF("podiumP2", v)}
              min={0} max={200} step={1} prefix="+"
              hint="bonus pour le 2e"
            />
            <FormulaField
              label="P3 🥉"
              value={formula.podiumP3}
              onChange={(v) => setF("podiumP3", v)}
              min={0} max={200} step={1} prefix="+"
              hint="bonus pour le 3e"
            />
          </div>

          <p className="text-xs text-brand-muted uppercase tracking-wider font-semibold mb-2">Malus incidents ⚠️</p>
          <div className="grid grid-cols-2 gap-4">
            <FormulaField
              label="Malus par incident"
              value={formula.incidentMalusPct}
              onChange={(v) => setF("incidentMalusPct", v)}
              min={0} max={20} step={0.5} suffix="%" danger
              hint={`−${formula.incidentMalusPct}% XP par incident`}
            />
            <FormulaField
              label="Cap malus total"
              value={formula.incidentMalusCap}
              onChange={(v) => setF("incidentMalusCap", v)}
              min={0} max={100} step={1} suffix="%" danger
              hint={`Maximum −${formula.incidentMalusCap}% de malus`}
            />
          </div>
          {xpLastPreview != null && (
            <p className="text-xs text-brand-muted mt-3">
              Exemple : dernier sans incident ≈ <span className="text-white font-semibold">{xpLastPreview} XP</span>
              {" · "}cap −{formula.incidentMalusCap}% → min <span className="text-white font-semibold">{Math.round(xpLastPreview * (1 - formula.incidentMalusCap / 100))} XP</span>
            </p>
          )}
        </div>

        <div className="border-t border-brand-border" />

        {/* ── Argent PADS (pool) ── */}
        <div>
          <h3 className="font-heading text-base font-semibold text-white mb-1">
            Argent 💰 <span className="text-brand-muted text-sm font-normal">(système pool par classe)</span>
          </h3>
          <p className="text-brand-muted text-xs mb-4">
            Base = durée × base/min × coeff · Pool = Base × N · Prize pool = Pool × (1 − org%) · P1 = Prize pool × p1% · Dernier = Base × min%
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <FormulaField
              label="Base / minute"
              value={formula.moneyBasePerMin}
              onChange={(v) => setF("moneyBasePerMin", v)}
              min={1} max={10000} step={1} suffix=" 💰"
              hint={dur != null
                ? `Base : ${Math.round(dur * formula.moneyBasePerMin * formula.coeffCourse).toLocaleString("fr-FR")} 💰`
                : "durée × valeur × coeff"}
            />
            <FormulaField
              label="Coeff course"
              value={formula.coeffCourse}
              onChange={(v) => setF("coeffCourse", v)}
              min={0.5} max={3} step={0.1} prefix="×"
              hint="Normal=1.0 · Tech=1.2 · Diff=1.5"
            />
            <FormulaField
              label="Part organisateur"
              value={formula.organizerSharePct}
              onChange={(v) => setF("organizerSharePct", v)}
              min={0} max={80} step={1} suffix="%"
              hint={`Pool org = Pool × ${formula.organizerSharePct}%`}
            />
            <FormulaField
              label="Prime P1 (% pool)"
              value={formula.p1PrizePct}
              onChange={(v) => setF("p1PrizePct", v)}
              min={1} max={100} step={1} suffix="%"
              hint="% du prize pool pour le 1er"
            />
            <FormulaField
              label="Min dernier (% base)"
              value={formula.pLastMinPct}
              onChange={(v) => setF("pLastMinPct", v)}
              min={0} max={100} step={1} suffix="%"
              hint="Prime minimale pour le dernier"
            />
          </div>
        </div>

        <div className="border-t border-brand-border" />

        {/* ── Réputation ── */}
        <div>
          <h3 className="font-heading text-base font-semibold text-white mb-1">
            Réputation <span className="text-brand-muted text-sm font-normal">(basée sur incidents XML — départ 50, cap 200)</span>
          </h3>
          <p className="text-brand-muted text-xs mb-4">Incidents extraits automatiquement du fichier XML LMU.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <FormulaField
              label="0–1 incident"
              value={formula.repDelta_01}
              onChange={(v) => setF("repDelta_01", v)}
              min={-20} max={20} step={1}
              hint="gain réputation" prefix={formula.repDelta_01 >= 0 ? "+" : undefined}
            />
            <FormulaField
              label="2 incidents"
              value={formula.repDelta_2}
              onChange={(v) => setF("repDelta_2", v)}
              min={-20} max={20} step={1}
              hint="gain réputation" prefix={formula.repDelta_2 >= 0 ? "+" : undefined}
            />
            <FormulaField
              label="3 incidents"
              value={formula.repDelta_3}
              onChange={(v) => setF("repDelta_3", v)}
              min={-20} max={20} step={1}
              hint="perte réputation" danger={formula.repDelta_3 < 0}
            />
            <FormulaField
              label="4+ incidents"
              value={formula.repDelta_4plus}
              onChange={(v) => setF("repDelta_4plus", v)}
              min={-20} max={20} step={1}
              hint="perte réputation" danger={formula.repDelta_4plus < 0}
            />
            <FormulaField
              label="Bonus finish"
              value={formula.repFinishBonus}
              onChange={(v) => setF("repFinishBonus", v)}
              min={0} max={10} step={1}
              hint="+pts si non-DNF" prefix="+"
            />
          </div>
        </div>

        <div className="border-t border-brand-border" />

        {/* ── Ladder ── */}
        <div>
          <h3 className="font-heading text-base font-semibold text-white mb-1">
            Ladder <span className="text-brand-muted text-sm font-normal">(Score = ((N+1)/2) − pos · Points = Score × coeff)</span>
          </h3>
          <p className="text-brand-muted text-xs mb-4">Coefficient selon nombre de pilotes dans la même classe. Seuils : Silver 100, Gold 250, Platine 400 pts.</p>
          <div className="grid grid-cols-3 gap-4">
            <FormulaField
              label="Coeff 6–10 pilotes"
              value={formula.ladderCoeff_sm}
              onChange={(v) => setF("ladderCoeff_sm", v)}
              min={1} max={20} step={1}
              hint="×4 par défaut"
              prefix="×"
            />
            <FormulaField
              label="Coeff 11–15 pilotes"
              value={formula.ladderCoeff_md}
              onChange={(v) => setF("ladderCoeff_md", v)}
              min={1} max={20} step={1}
              hint="×3 par défaut"
              prefix="×"
            />
            <FormulaField
              label="Coeff 16–20 pilotes"
              value={formula.ladderCoeff_lg}
              onChange={(v) => setF("ladderCoeff_lg", v)}
              min={1} max={20} step={1}
              hint="×2 par défaut"
              prefix="×"
            />
          </div>
        </div>

        <div className="border-t border-brand-border" />

        {/* ── Avertissements & Sanctions ── */}
        <div>
          <h3 className="font-heading text-base font-semibold text-white mb-1">
            Avertissements &amp; Sanctions
          </h3>
          <p className="text-brand-muted text-xs mb-4">
            Badges affichés dans le tableau selon le nombre d'incidents. Valeurs sauvegardées automatiquement après chaque course.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <FormulaField
              label="Seuil avertissement ⚠️"
              value={formula.warningIncidentThresh}
              onChange={(v) => setF("warningIncidentThresh", v)}
              min={1} max={20} step={1}
              hint={`≥${formula.warningIncidentThresh} incidents → badge ⚠️`}
            />
            <FormulaField
              label="Seuil sanction 🚫"
              value={formula.sanctionIncidentThresh}
              onChange={(v) => setF("sanctionIncidentThresh", v)}
              min={1} max={30} step={1}
              hint={`≥${formula.sanctionIncidentThresh} incidents → badge 🚫`}
              danger
            />
            <FormulaField
              label="Seuil force élevée (N)"
              value={formula.forceThreshold}
              onChange={(v) => setF("forceThreshold", v)}
              min={100} max={10000} step={100}
              hint="Contacts au-dessus de ce seuil"
            />
          </div>
          <button
            type="button"
            onClick={() => setFormula(DEFAULT_FORMULA)}
            className="mt-4 text-xs text-brand-muted hover:text-white transition-colors underline underline-offset-2"
          >
            Réinitialiser toutes les valeurs par défaut
          </button>
        </div>

        <div className="border-t border-brand-border" />

        {/* ── Fichier ── */}
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
                >×</button>
              </div>
            ) : (
              <div className="text-brand-muted">
                <UploadIcon />
                <p className="mt-2 font-medium">Glissez un fichier ou cliquez pour parcourir</p>
                <p className="text-sm mt-1">XML (LMU), JSON ou CSV</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept=".xml,.json,.csv" className="hidden"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }} />
          </div>
        </div>

        {/* ── Durée ── */}
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-brand-text mb-1.5">
            Durée de la course (minutes)
            {isXml
              ? <span className="ml-2 text-brand-muted font-normal text-xs">optionnel — auto-détectée depuis le XML</span>
              : <span className="text-brand-red"> *</span>}
          </label>
          <input
            id="duration" type="number" min="1" max="480" value={duration}
            onChange={(e) => { setDuration(e.target.value); setError(null); }}
            placeholder={isXml ? "Laisser vide = depuis le XML" : "ex : 45"}
            className="w-48 px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
          />
        </div>

        <button type="submit" disabled={loading}
          className="flex items-center gap-2 px-8 py-3 rounded-lg bg-brand-red hover:bg-brand-red/80 disabled:opacity-50 text-white font-semibold transition-colors">
          {loading ? <Spinner /> : null}
          {loading ? "Analyse en cours…" : "Aperçu des récompenses →"}
        </button>
      </form>
    );
  }

  // ── Preview step ────────────────────────────────────────────────────────────
  if (step === "preview") {
    const found      = preview.filter((e) => e.foundInDb || e.willBeCreated).length;
    const autoNew    = preview.filter((e) => e.willBeCreated).length;
    const skipped    = preview.filter((e) => !e.foundInDb && !e.willBeCreated).length;
    const hasExtended = preview.some((e) => e.carClass !== undefined);
    const hasLadder   = preview.some((e) => (e.ladderDelta ?? 0) !== 0);
    const classes = Array.from(new Set(preview.map((e) => e.carClass).filter(Boolean)));
    const totalXp = preview.filter((e) => e.foundInDb || e.willBeCreated).reduce((s, e) => s + e.xpGained, 0);
    const leader  = [...preview].sort((a, b) => a.position - b.position)[0];
    const hasIncidents = preview.some((e) => (e.incidents ?? 0) > 0);

    return (
      <div className="space-y-6">
        {error && <ErrorBanner message={error} />}

        {/* Race summary */}
        <div className="bg-brand-dark border border-brand-border rounded-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-brand-red via-brand-red/60 to-transparent" />
          <div className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-brand-red font-bold text-xs uppercase tracking-wider">
                    {sessionLabel(meta.sessionType)}
                  </span>
                  {classes.map((cls) => (
                    <span key={cls} className="text-xs px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-muted font-mono">{cls}</span>
                  ))}
                </div>
                <h2 className="font-heading text-xl font-bold text-white">{meta.trackVenue ?? "Circuit inconnu"}</h2>
                {meta.trackEvent && <p className="text-brand-muted text-sm mt-0.5">{meta.trackEvent}</p>}
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                <InfoPill icon="📅" label={formatDate(meta.dateString)} />
                <InfoPill icon="⏱" label={`${durationUsed} min${durationAutoDetected ? " (XML)" : ""}`} />
                {meta.trackLengthM && <InfoPill icon="📏" label={`${(meta.trackLengthM / 1000).toFixed(3)} km`} />}
                <InfoPill icon="🏎️" label={`${preview.length} pilotes`} />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-brand-border">
              <MiniStat label="Détectés" value={preview.length} color="text-white" />
              <MiniStat label="Seront mis à jour" value={found} color="text-green-400" />
              {autoNew > 0 && <MiniStat label="Profils créés auto" value={autoNew} color="text-emerald-400" />}
              {skipped > 0 && <MiniStat label="Ignorés" value={skipped} color="text-yellow-400" />}
              <MiniStat label="XP distribués" value={totalXp.toLocaleString("fr-FR")} color="text-brand-red" />
              {leader && <MiniStat label="Vainqueur" value={leader.username} color="text-yellow-300" />}
            </div>
          </div>
        </div>

        {/* Standings table */}
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
                {hasIncidents && <Th>Incidents</Th>}
                <Th>XP classe</Th>
                <Th>Argent</Th>
                {hasLadder && <Th>Ladder Δ</Th>}
                <Th>Réputation Δ</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody>
              {[...preview].sort((a, b) => a.position - b.position).map((entry) => {
                const isDnf = entry.finishStatus && entry.finishStatus !== "Finished Normally";
                return (
                  <tr key={entry.username}
                    className={`border-b border-brand-border last:border-0 transition-colors
                      ${(entry.foundInDb || entry.willBeCreated) ? "hover:bg-brand-surface/50" : "opacity-50"}
                      ${isDnf ? "bg-red-500/5" : ""}`}>
                    <td className="px-4 py-3 font-bold text-brand-text text-center whitespace-nowrap">
                      {entry.position === 1 ? "🥇" : entry.position === 2 ? "🥈" : entry.position === 3 ? "🥉" : `#${entry.position}`}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-text whitespace-nowrap">{entry.username}</p>
                      {entry.teamName && <p className="text-xs text-brand-muted truncate max-w-[180px]">{entry.teamName}</p>}
                    </td>
                    {hasExtended && (
                      <td className="px-4 py-3">
                        {entry.carClass && (
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-brand-surface border border-brand-border text-brand-muted">{entry.carClass}</span>
                        )}
                      </td>
                    )}
                    {hasExtended && <td className="px-4 py-3 text-brand-text text-center">{entry.laps ?? "—"}</td>}
                    {hasExtended && <td className="px-4 py-3 font-mono text-brand-text whitespace-nowrap">{formatLapTime(entry.bestLapTimeSec)}</td>}
                    {hasExtended && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {isDnf ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 font-bold">DNF</span>
                        ) : entry.finishStatus ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">Classé</span>
                        ) : null}
                      </td>
                    )}
                    {hasIncidents && (
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {(entry.incidents ?? 0) > 0 ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-orange-400 font-bold">{entry.incidents}</span>
                            {incidentBadge(entry.incidents, formula.warningIncidentThresh, formula.sanctionIncidentThresh)}
                          </span>
                        ) : (
                          <span className="text-green-400 text-xs">✓</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 font-semibold text-brand-red whitespace-nowrap">
                      +{entry.xpGained.toLocaleString("fr-FR")} XP
                    </td>
                    <td className="px-4 py-3 text-brand-muted whitespace-nowrap">
                      +{entry.moneyGained.toLocaleString("fr-FR")} 💰
                    </td>
                    {hasLadder && (
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-center">
                        {(entry.ladderDelta ?? 0) > 0 ? (
                          <span className="text-blue-400 font-bold">+{entry.ladderDelta}</span>
                        ) : (entry.ladderDelta ?? 0) < 0 ? (
                          <span className="text-red-400 font-bold">{entry.ladderDelta}</span>
                        ) : (
                          <span className="text-brand-muted">0</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {(entry.reputationDelta ?? 0) > 0 ? (
                        <span className="text-green-400 font-semibold">+{entry.reputationDelta}</span>
                      ) : (entry.reputationDelta ?? 0) < 0 ? (
                        <span className="text-red-400 font-semibold">{entry.reputationDelta}</span>
                      ) : (
                        <span className="text-brand-muted">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {entry.willBeCreated
                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">Nouveau ✦</span>
                        : entry.foundInDb
                        ? <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/10 border border-green-500/30 text-green-400">Trouvé</span>
                        : <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">Ignoré</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {autoNew > 0 && (
          <p className="text-emerald-400/80 text-sm">
            ✦ {autoNew} profil{autoNew > 1 ? "s" : ""} créé{autoNew > 1 ? "s" : ""} automatiquement avec le pseudo LMU.
          </p>
        )}
        {skipped > 0 && (
          <p className="text-yellow-400/80 text-sm">
            ⚠️ {skipped} pilote{skipped > 1 ? "s" : ""} ignoré{skipped > 1 ? "s" : ""} (non reconnus en base).
          </p>
        )}

        <div className="flex gap-3 flex-wrap">
          <button onClick={handleProcess} disabled={loading || found === 0}
            className="flex items-center gap-2 px-8 py-3 rounded-lg bg-brand-red hover:bg-brand-red/80 disabled:opacity-50 text-white font-bold transition-colors">
            {loading ? <Spinner /> : null}
            {loading ? "Sauvegarde…" : `✓ Valider et mettre à jour ${found} profil${found > 1 ? "s" : ""}`}
          </button>
          <button onClick={reset} disabled={loading}
            className="px-6 py-3 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text hover:border-brand-text transition-colors">
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
        <h2 className="font-heading text-2xl font-bold text-white mb-2">Résultats enregistrés !</h2>
        <p className="text-brand-muted mb-2">La notification Discord a été envoyée automatiquement.</p>
        <p className="text-xs text-brand-muted mb-6">Les paramètres de formule ont été sauvegardés comme nouveaux défauts.</p>
        {result && (
          <div className="flex justify-center gap-6 mb-6 text-sm flex-wrap">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{result.updatedPlayers}</p>
              <p className="text-brand-muted">profils mis à jour</p>
            </div>
            {(result.autoCreated ?? 0) > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-400">{result.autoCreated}</p>
                <p className="text-brand-muted">profils créés auto</p>
              </div>
            )}
            {result.skipped > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-400">{result.skipped}</p>
                <p className="text-brand-muted">ignorés</p>
              </div>
            )}
          </div>
        )}
        <button onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red/80 text-white font-semibold transition-colors">
          Traiter une autre course
        </button>
      </div>
    </div>
  );
}

// ── FormulaField ─────────────────────────────────────────────────────────────

function FormulaField({
  label, value, onChange, min, max, step, hint, suffix, prefix, danger,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number;
  hint?: string; suffix?: string; prefix?: string; danger?: boolean;
}) {
  return (
    <div className="bg-brand-surface border border-brand-border rounded-xl p-3">
      <p className="text-xs text-brand-muted mb-2 font-semibold uppercase tracking-wide">{label}</p>
      <div className="flex items-center gap-1">
        {prefix && <span className={`text-sm font-bold ${danger ? "text-red-400" : "text-green-400"}`}>{prefix}</span>}
        <input
          type="number" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-full bg-brand-dark border border-brand-border rounded-lg px-2 py-1.5 text-white font-mono text-sm font-bold focus:outline-none focus:border-brand-red text-center"
        />
        {suffix && <span className="text-sm text-brand-muted">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-brand-muted mt-1.5">{hint}</p>}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 font-semibold text-brand-muted whitespace-nowrap text-xs uppercase tracking-wide">{children}</th>;
}

function InfoPill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-brand-surface border border-brand-border rounded-lg px-3 py-1.5 text-brand-muted text-xs">
      <span>{icon}</span><span>{label}</span>
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
  return <div className="p-4 rounded-lg bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">{message}</div>;
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
