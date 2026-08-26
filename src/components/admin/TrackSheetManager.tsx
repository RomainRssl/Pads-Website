"use client";

// Fiches d'identité des circuits pour les affiches FIS.
// La clé d'une fiche est le nom EXACT du circuit tel qu'il apparaît dans
// Event.track — l'aide à la saisie propose la liste officielle plus les
// valeurs déjà utilisées en base.

import { useEffect, useState } from "react";

interface Track {
  track: string;
  officialName: string;
  displayName: string;
  country: string;
  countryCode: string;
  location: string;
}

const FICHE_VIDE: Track = {
  track: "",
  officialName: "",
  displayName: "",
  country: "",
  countryCode: "",
  location: "",
};

export default function TrackSheetManager() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [knownTracks, setKnownTracks] = useState<string[]>([]);
  const [fiche, setFiche] = useState<Track>(FICHE_VIDE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/tracks")
      .then((r) => r.json())
      .then((data: { tracks: Track[]; knownTracks: string[] }) => {
        setTracks(data.tracks);
        setKnownTracks(data.knownTracks);
      });
  }, []);

  const existante = tracks.some((t) => t.track === fiche.track);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setFiche((p) => ({ ...p, [name]: value }));
    setError(null);
    // Sélectionner un circuit qui a déjà une fiche pré-remplit le formulaire.
    if (name === "track") {
      const deja = tracks.find((t) => t.track === value);
      if (deja) setFiche(deja);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fiche,
          countryCode: fiche.countryCode.toLowerCase(),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erreur lors de la sauvegarde");
      }
      const savedTrack: Track = await res.json();
      setTracks((prev) => {
        const sans = prev.filter((t) => t.track !== savedTrack.track);
        return [...sans, savedTrack].sort((a, b) => a.track.localeCompare(b.track));
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  const champs: { name: keyof Track; label: string; placeholder: string; maxLength?: number }[] = [
    { name: "officialName", label: "Nom officiel", placeholder: "CIRCUIT DES 24 HEURES DU MANS" },
    { name: "displayName", label: "Nom affiché (grand titre)", placeholder: "LE MANS" },
    { name: "country", label: "Pays", placeholder: "FRANCE" },
    { name: "countryCode", label: "Code pays (ISO, drapeau)", placeholder: "fr", maxLength: 2 },
    { name: "location", label: "Localisation", placeholder: "LE MANS · SARTHE" },
  ];

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="space-y-4 bg-brand-surface border border-brand-border rounded-xl p-4">
        {error && (
          <div className="p-3 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs text-brand-muted mb-1 block">
            Circuit (nom exact utilisé dans les courses)
          </label>
          <input
            name="track" required list="known-tracks"
            value={fiche.track} onChange={handleChange}
            placeholder="— Nom exact du circuit —"
            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
          />
          <datalist id="known-tracks">
            {knownTracks.map((t) => <option key={t} value={t} />)}
          </datalist>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {champs.map((c) => (
            <div key={c.name}>
              <label className="text-xs text-brand-muted mb-1 block">{c.label}</label>
              <input
                name={c.name} required maxLength={c.maxLength}
                value={fiche[c.name]} onChange={handleChange}
                placeholder={c.placeholder}
                className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              saved
                ? "bg-green-500/20 border border-green-500/40 text-green-400"
                : "bg-brand-orange/10 border border-brand-orange/30 text-brand-orange hover:bg-brand-orange/20 disabled:opacity-40"
            }`}
          >
            {saved ? "✓ Sauvegardé" : saving ? "…" : existante ? "Mettre à jour la fiche" : "Créer la fiche"}
          </button>
          {fiche.track !== "" && (
            <button
              type="button"
              onClick={() => setFiche(FICHE_VIDE)}
              className="text-xs text-brand-muted hover:text-white transition-colors"
            >
              Nouvelle fiche
            </button>
          )}
        </div>
      </form>

      {/* Fiches existantes */}
      {tracks.length > 0 && (
        <div className="space-y-2">
          {tracks.map((t) => (
            <button
              key={t.track}
              onClick={() => setFiche(t)}
              className={`w-full text-left flex items-center gap-3 bg-brand-surface border rounded-xl px-4 py-3 transition-colors ${
                fiche.track === t.track ? "border-brand-orange" : "border-brand-border hover:border-brand-orange/50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://flagcdn.com/w40/${t.countryCode.toLowerCase()}.png`}
                alt={t.country}
                className="h-4 rounded-sm"
              />
              <span className="font-semibold text-sm text-white">{t.displayName}</span>
              <span className="flex-1 text-sm text-brand-muted truncate">{t.track}</span>
              <span className="text-xs text-brand-muted hidden sm:block">{t.location}</span>
            </button>
          ))}
        </div>
      )}
      {tracks.length === 0 && (
        <p className="text-brand-muted text-sm">
          Aucune fiche circuit. Créez-en une pour pouvoir générer les affiches.
        </p>
      )}
    </div>
  );
}
