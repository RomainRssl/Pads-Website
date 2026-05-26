"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "./ImageUpload";

interface FormState {
  title: string;
  date: string;
  game: string;
  track: string;
  description: string;
  serverName: string;
  serverPassword: string;
}

// Each car entry now carries an optional max-car count per class
interface CarEntry {
  name: string;
  maxCars: number | "";
}

const initialState: FormState = {
  title: "",
  date: "",
  game: "",
  track: "",
  description: "",
  serverName: "",
  serverPassword: "",
};

const LMU_CARS = [
  { group: "LMGT3", options: [
    "LMGT3 (toute classe)",
    "Aston Martin Vantage AMR LMGT3 Evo",
    "BMW M4 LMGT3",
    "BMW M4 LMGT3 Evo",
    "Chevrolet Corvette Z06 LMGT3.R",
    "Ferrari 296 LMGT3",
    "Ford Mustang LMGT3",
    "Lamborghini Huracán LMGT3 Evo 2",
    "Lexus RC F LMGT3",
    "Mercedes-AMG LMGT3",
    "McLaren 720S LMGT3 Evo",
    "Porsche 911 LMGT3 R (992)",
  ]},
  { group: "Hypercar", options: [
    "Hypercar (toute classe)",
    "Alpine A424",
    "Aston Martin Valkyrie AMR LMH",
    "BMW M Hybrid V8",
    "Cadillac V-Series.R",
    "Ferrari 499P",
    "Genesis GMR-001 LMDh",
    "Glickenhaus SCG 007",
    "Isotta Fraschini Tipo 6-C",
    "Lamborghini SC63",
    "Peugeot 9X8 2023",
    "Peugeot 9X8 2024",
    "Porsche 963",
    "Toyota GR010-Hybrid",
    "Vanwall Vandervell 680",
  ]},
  { group: "LMP2", options: [
    "LMP2 (toute classe)",
    "Oreca 07 Gibson",
    "Oreca 07 Gibson ELMS",
  ]},
  { group: "LMP3", options: [
    "LMP3 (toute classe)",
    "Ligier JS P325",
    "Ginetta G61-LT-P3 Evo",
    "Duqueine D09",
  ]},
  { group: "GTE", options: [
    "GTE (toute classe)",
    "Aston Martin Vantage GTE",
    "Chevrolet Corvette C8.R",
    "Ferrari 488 GTE Evo",
    "Porsche 911 RSR-19",
  ]},
  { group: "Mystère", options: [
    "Mystère",
  ]},
];

export default function CreateEventForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [cars, setCars] = useState<CarEntry[]>([{ name: "", maxCars: "" }]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
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
          <input
            id="track" name="track" type="text" required
            value={form.track} onChange={handleChange}
            placeholder="Spa-Francorchamps"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
          />
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
