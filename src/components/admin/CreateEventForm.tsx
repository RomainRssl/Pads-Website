"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "./ImageUpload";
import { useTrackGroups } from "@/lib/use-track-groups";
import { LMU_CARS } from "@/lib/lmu-cars";

type SplitMode = "RANKED" | "RANDOM" | "MANUAL";

interface FormState {
  title: string;
  date: string;
  game: string;
  track: string;
  description: string;
  serverName: string;
  serverPassword: string;
  splitMode: SplitMode;
  trackCapacity: string;
  freeSlots: string;
  weekNumber: string;
  entryCredits: string;
  raceDuration: string;
  posterAccent: string;
}

// Each car entry now carries an optional max-car count per class
interface CarEntry {
  name: string;
  maxCars: number | "";
}

// Identité du circuit utilisée par l'affiche — saisie ici, mémorisée ensuite
interface TrackSheet {
  officialName: string;
  displayName: string;
  country: string;
  countryCode: string;
  location: string;
}

const EMPTY_SHEET: TrackSheet = {
  officialName: "",
  displayName: "",
  country: "",
  countryCode: "",
  location: "",
};

/**
 * Première ébauche de fiche à partir du nom du circuit, pour éviter de tout
 * taper : « Autodromo … (Imola) (2024 Pack 1 DLC) » propose « IMOLA ».
 * Les mentions de DLC ou de variante ne sont pas des noms de circuit.
 */
function draftSheetFromTrack(track: string): TrackSheet {
  const parentheses = [...track.matchAll(/\(([^)]+)\)/g)].map((m) => m[1].trim());
  const base = track.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const alias = parentheses.find((p) => !/DLC|pack|ELMS|WEC|layout|short|national|gp\b/i.test(p));

  return {
    ...EMPTY_SHEET,
    officialName: base.toUpperCase(),
    displayName: (alias ?? base).toUpperCase(),
  };
}

const SPLIT_MODE_OPTIONS: { value: SplitMode; label: string; description: string }[] = [
  { value: "RANKED", label: "Par classement", description: "Les meilleurs du ladder en plateau 1" },
  { value: "RANDOM", label: "Aléatoire", description: "Répartition aléatoire entre les plateaux" },
  { value: "MANUAL", label: "Manuel", description: "Aucune répartition automatique" },
];

const initialState: FormState = {
  title: "",
  date: "",
  game: "",
  track: "",
  description: "",
  serverName: "",
  serverPassword: "",
  splitMode: "RANKED",
  trackCapacity: "",
  freeSlots: "0",
  weekNumber: "",
  entryCredits: "",
  raceDuration: "60",
  posterAccent: "#F07000",
};

export default function CreateEventForm() {
  const router = useRouter();
  const trackGroups = useTrackGroups();
  const [form, setForm] = useState<FormState>(initialState);
  const [cars, setCars] = useState<CarEntry[]>([{ name: "", maxCars: "" }]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [trackCapacities, setTrackCapacities] = useState<Record<string, number>>({});
  const [sheet, setSheet] = useState<TrackSheet>(EMPTY_SHEET);
  const [knownSheets, setKnownSheets] = useState<Record<string, TrackSheet>>({});
  const [posterToken, setPosterToken] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [posterLoading, setPosterLoading] = useState(false);
  const [posterError, setPosterError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/track-capacities")
      .then((r) => r.json())
      .then((data: Record<string, number>) => setTrackCapacities(data));

    // Fiches circuit déjà enregistrées : elles pré-remplissent le bloc affiche
    fetch("/api/admin/tracks")
      .then((r) => (r.ok ? r.json() : { tracks: [] }))
      .then((data: { tracks: (TrackSheet & { track: string })[] }) => {
        const map: Record<string, TrackSheet> = {};
        for (const t of data.tracks ?? []) {
          map[t.track] = {
            officialName: t.officialName,
            displayName: t.displayName,
            country: t.country,
            countryCode: t.countryCode,
            location: t.location,
          };
        }
        setKnownSheets(map);
      })
      .catch(() => {});
  }, []);

  function updateCarName(idx: number, val: string) {
    setCars((prev) => prev.map((c, i) => i === idx ? { ...c, name: val } : c));
  }

  function updateCarMax(idx: number, val: string) {
    const parsed = val === "" ? "" : Math.max(1, parseInt(val, 10) || 1);
    setCars((prev) => prev.map((c, i) => i === idx ? { ...c, maxCars: parsed } : c));
  }

  function addCar() {
    if (cars.length < 5) setCars((prev) => [...prev, { name: "", maxCars: "" }]);
  }

  function removeCar(idx: number) {
    setCars((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // Auto-fill trackCapacity when a track is selected and a capacity is stored
      if (name === "track" && trackCapacities[value]) {
        next.trackCapacity = String(trackCapacities[value]);
      }
      return next;
    });

    // Fiche circuit : celle déjà enregistrée, sinon une ébauche à compléter
    if (name === "track") {
      setSheet(value ? knownSheets[value] ?? draftSheetFromTrack(value) : EMPTY_SHEET);
      setPosterToken(null);
      setPosterUrl(null);
      setPosterError(null);
    }

    setError(null);
  }


  // Génère l'affiche avant création : le résultat est conservé sous un jeton
  // et rattaché à la course au moment de la soumission.
  async function handleGeneratePoster() {
    setPosterLoading(true);
    setPosterError(null);
    try {
      const carsPayload = cars
        .filter((c) => c.name.trim() !== "")
        .map((c) => ({ name: c.name, maxCars: c.maxCars === "" ? null : c.maxCars }));

      if (!form.track || !form.date || carsPayload.length === 0) {
        throw new Error("Renseignez le circuit, la date et au moins une classe.");
      }

      const sheetComplete = Object.values(sheet).every((v) => v.trim() !== "");
      if (!sheetComplete) {
        throw new Error(
          "Complétez l'identité du circuit ci-dessous (nom affiché, pays, code pays, localisation)."
        );
      }

      const res = await fetch("/api/admin/poster/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: form.track,
          date: new Date(form.date).toISOString(),
          cars: carsPayload,
          weekNumber: form.weekNumber ? parseInt(form.weekNumber, 10) : null,
          entryCredits: form.entryCredits ? parseInt(form.entryCredits, 10) : null,
          raceDuration: form.raceDuration ? parseInt(form.raceDuration, 10) : null,
          posterAccent: form.posterAccent || null,
          trackSheet: sheet,
        }),
      });

      const d = await res.json();
      if (d.statut === "READY") {
        setPosterToken(d.token);
        setPosterUrl(d.url);
      } else {
        setPosterToken(null);
        setPosterUrl(null);
        setPosterError(d.message ?? d.error ?? "La génération a échoué.");
      }
    } catch (err) {
      setPosterError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setPosterLoading(false);
    }
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;
    const fd = new FormData();
    fd.append("file", imageFile);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Erreur lors de l'upload de l'image");
    }
    const data = await res.json();
    return data.url as string;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const imageUrl = await uploadImage();

      // Serialize cars as { name, maxCars } objects — maxCars is null when not set
      const carsPayload = cars
        .filter((c) => c.name.trim() !== "")
        .map((c) => ({ name: c.name, maxCars: c.maxCars === "" ? null : c.maxCars }));

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cars: carsPayload,
          date: new Date(form.date).toISOString(),
          description: form.description || undefined,
          imageUrl: imageUrl || undefined,
          serverName: form.serverName || undefined,
          serverPassword: form.serverPassword || undefined,
          splitMode: form.splitMode,
          trackCapacity: form.trackCapacity ? parseInt(form.trackCapacity, 10) : null,
          freeSlots: parseInt(form.freeSlots, 10) || 0,
          weekNumber: form.weekNumber ? parseInt(form.weekNumber, 10) : null,
          entryCredits: form.entryCredits ? parseInt(form.entryCredits, 10) : null,
          raceDuration: form.raceDuration ? parseInt(form.raceDuration, 10) : null,
          posterAccent: form.posterAccent || null,
          posterDraftToken: posterToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Une erreur est survenue");
      }

      setSuccess(true);
      setForm(initialState);
      setCars([{ name: "", maxCars: "" }]);
      setImageFile(null);
      setPosterToken(null);
      setPosterUrl(null);

      setTimeout(() => router.push("/admin"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {success && (
        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
          Événement créé avec succès ! Redirection...
        </div>
      )}
      {error && (
        <div className="p-4 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-brand-text mb-1.5">
          Titre de la course <span className="text-brand-orange">*</span>
        </label>
        <input
          id="title" name="title" type="text" required
          value={form.title} onChange={handleChange}
          placeholder="Gran Turismo World Series — Manche 3"
          className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
        />
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-brand-text mb-1.5">
          Date et heure <span className="text-brand-orange">*</span>
        </label>
        <input
          id="date" name="date" type="datetime-local" required
          value={form.date} onChange={handleChange}
          className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
        />
      </div>

      {/* Game / Track — 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="game" className="block text-sm font-medium text-brand-text mb-1.5">
            Jeu <span className="text-brand-orange">*</span>
          </label>
          <input
            id="game" name="game" type="text" required
            value={form.game} onChange={handleChange}
            placeholder="Gran Turismo 7"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
          />
        </div>
        <div>
          <label htmlFor="track" className="block text-sm font-medium text-brand-text mb-1.5">
            Circuit <span className="text-brand-orange">*</span>
          </label>
          <select
            id="track" name="track" required
            value={form.track} onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
          >
            <option value="">— Choisir un circuit —</option>
            {trackGroups.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Car dropdown — multi-select up to 5, each with optional max cars */}
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Voiture / Classe <span className="text-brand-red">*</span>
          <span className="ml-2 text-brand-muted font-normal text-xs">jusqu&apos;à 5 classes</span>
        </label>
        <div className="space-y-2">
          {cars.map((car, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              {/* Class selector */}
              <select
                value={car.name}
                onChange={(e) => updateCarName(idx, e.target.value)}
                required={idx === 0}
                className="flex-1 px-3 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
              >
                <option value="">— Choisir une voiture ou classe —</option>
                {LMU_CARS.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Max cars input — only shown once a class is selected */}
              {car.name && (
                <div className="relative shrink-0 w-28">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={car.maxCars}
                    onChange={(e) => updateCarMax(idx, e.target.value)}
                    placeholder="Max"
                    className="w-full px-3 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors text-sm"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted text-xs">
                    voitures
                  </span>
                </div>
              )}

              {/* Remove button */}
              {cars.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCar(idx)}
                  className="shrink-0 px-3 py-2 rounded-lg border border-brand-border text-brand-muted hover:text-brand-red hover:border-brand-red transition-colors text-lg leading-none"
                >×</button>
              )}
            </div>
          ))}
          {cars.length < 5 && (
            <button
              type="button"
              onClick={addCar}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-brand-border text-brand-muted hover:border-brand-red hover:text-brand-red transition-colors text-sm"
            >
              <span className="text-lg leading-none">+</span> Ajouter une classe / voiture
            </button>
          )}
        </div>
      </div>

      {/* Server info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="serverName" className="block text-sm font-medium text-brand-text mb-1.5">
            Nom du serveur <span className="text-brand-muted font-normal">(optionnel)</span>
          </label>
          <input
            id="serverName" name="serverName" type="text"
            value={form.serverName} onChange={handleChange}
            placeholder="PADS Racing #1"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
          />
        </div>
        <div>
          <label htmlFor="serverPassword" className="block text-sm font-medium text-brand-text mb-1.5">
            Mot de passe <span className="text-brand-muted font-normal">(optionnel)</span>
          </label>
          <input
            id="serverPassword" name="serverPassword" type="text"
            value={form.serverPassword} onChange={handleChange}
            placeholder="pads2024"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-brand-text mb-1.5">
          Description <span className="text-brand-muted font-normal">(optionnel)</span>
        </label>
        <textarea
          id="description" name="description" rows={4}
          value={form.description} onChange={handleChange}
          placeholder="Règles, informations importantes sur la course..."
          className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors resize-none"
        />
      </div>

      {/* Image upload */}
      <ImageUpload
        onImageSelect={setImageFile}
        preview={undefined}
      />

      {/* Split mode */}
      <div>
        <label htmlFor="splitMode" className="block text-sm font-medium text-brand-text mb-1.5">
          Création des splits
        </label>
        <select
          id="splitMode"
          name="splitMode"
          value={form.splitMode}
          onChange={handleChange}
          className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
        >
          {SPLIT_MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} — {opt.description}
            </option>
          ))}
        </select>
      </div>

      {/* Capacité circuit / Places libres */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="trackCapacity" className="block text-sm font-medium text-brand-text mb-1.5">
            Capacité du circuit <span className="text-brand-muted font-normal">(pilotes max)</span>
          </label>
          <input
            id="trackCapacity" name="trackCapacity" type="number" min={1}
            value={form.trackCapacity} onChange={handleChange}
            placeholder="ex: 30"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
          />
        </div>
        <div>
          <label htmlFor="freeSlots" className="block text-sm font-medium text-brand-text mb-1.5">
            Places libres à réserver
          </label>
          <input
            id="freeSlots" name="freeSlots" type="number" min={0}
            value={form.freeSlots} onChange={handleChange}
            placeholder="ex: 5"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
          />
          {form.trackCapacity && (
            <p className="text-xs text-brand-muted mt-1">
              → {Math.max(0, parseInt(form.trackCapacity, 10) - (parseInt(form.freeSlots, 10) || 0))} pilotes max par split
            </p>
          )}
        </div>
      </div>

      {/* Affiche FIS */}
      <div className="border border-brand-border rounded-xl p-4 space-y-4">
        <p className="text-sm font-medium text-brand-text">
          Affiche <span className="text-brand-muted font-normal">(générée automatiquement à la création — suivi et régénération depuis le tableau des événements)</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="weekNumber" className="block text-sm font-medium text-brand-text mb-1.5">
              Semaine
            </label>
            <input
              id="weekNumber" name="weekNumber" type="number" min={1} max={53}
              value={form.weekNumber} onChange={handleChange}
              placeholder="ex: 12"
              className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
            />
          </div>
          <div>
            <label htmlFor="entryCredits" className="block text-sm font-medium text-brand-text mb-1.5">
              Inscription <span className="text-brand-muted font-normal">(crédits)</span>
            </label>
            <input
              id="entryCredits" name="entryCredits" type="number" min={0}
              value={form.entryCredits} onChange={handleChange}
              placeholder="ex: 1500"
              className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
            />
          </div>
          <div>
            <label htmlFor="raceDuration" className="block text-sm font-medium text-brand-text mb-1.5">
              Durée <span className="text-brand-muted font-normal">(minutes)</span>
            </label>
            <input
              id="raceDuration" name="raceDuration" type="number" min={1}
              value={form.raceDuration} onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
            />
          </div>
        </div>
        <div>
          <label htmlFor="posterAccent" className="block text-sm font-medium text-brand-text mb-1.5">
            Couleur d&apos;accent
          </label>
          <div className="flex items-center gap-3">
            <input
              id="posterAccent" name="posterAccent" type="color"
              value={form.posterAccent} onChange={handleChange}
              className="h-10 w-14 rounded-lg bg-brand-surface border border-brand-border cursor-pointer"
            />
            <span className="font-mono text-sm text-brand-muted">{form.posterAccent}</span>
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: `${form.posterAccent}22`, color: form.posterAccent, border: `1px solid ${form.posterAccent}55` }}
            >
              Aperçu accent
            </span>
          </div>
        </div>

        {/* Identité du circuit — mémorisée pour les prochaines courses */}
        <div className="border-t border-brand-border pt-4">
          <p className="text-sm font-medium text-brand-text mb-1">
            Circuit sur l&apos;affiche
          </p>
          <p className="text-xs text-brand-muted mb-3">
            {form.track
              ? knownSheets[form.track]
                ? "Fiche déjà enregistrée pour ce circuit — modifiable ici."
                : "Première course sur ce circuit : complétez, ce sera mémorisé pour les suivantes."
              : "Choisissez d’abord un circuit plus haut."}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { key: "displayName", label: "Nom affiché (grand titre)", ph: "LE MANS" },
              { key: "officialName", label: "Nom officiel", ph: "CIRCUIT DES 24 HEURES DU MANS" },
              { key: "country", label: "Pays", ph: "FRANCE" },
              { key: "countryCode", label: "Code pays (drapeau)", ph: "fr" },
              { key: "location", label: "Localisation", ph: "LE MANS · SARTHE" },
            ] as const).map((f) => (
              <div key={f.key}>
                <label className="block text-xs text-brand-muted mb-1">{f.label}</label>
                <input
                  type="text"
                  value={sheet[f.key]}
                  maxLength={f.key === "countryCode" ? 2 : undefined}
                  disabled={!form.track}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSheet((p) => ({ ...p, [f.key]: v }));
                    setPosterError(null);
                  }}
                  placeholder={f.ph}
                  className="w-full px-3 py-2 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted text-sm focus:outline-none focus:border-brand-orange disabled:opacity-40 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Génération + aperçu */}
        <div className="border-t border-brand-border pt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleGeneratePoster}
              disabled={posterLoading}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand-orange/10 border border-brand-orange/30 text-brand-orange hover:bg-brand-orange/20 disabled:opacity-40 transition-colors"
            >
              {posterLoading
                ? "Génération en cours… (30 à 60 s)"
                : posterUrl ? "Régénérer l'affiche" : "Générer l'affiche"}
            </button>
            {posterUrl && (
              <span className="text-xs text-green-400">
                ✓ Affiche prête — elle sera attachée à la course
              </span>
            )}
            {!posterUrl && !posterLoading && (
              <span className="text-xs text-brand-muted">
                Optionnel — générable aussi plus tard depuis le tableau
              </span>
            )}
          </div>

          {posterError && (
            <p className="text-xs text-brand-orange mt-2">{posterError}</p>
          )}

          {posterUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt="Aperçu de l'affiche"
              className="mt-3 w-full max-w-xs rounded-lg border border-brand-border"
            />
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-lg bg-brand-orange hover:bg-brand-orange/80 disabled:opacity-50 text-white font-semibold transition-colors"
      >
        {loading ? "Création en cours…" : "Créer l'événement"}
      </button>
    </form>
  );
}
