"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageUpload from "./ImageUpload";
import { CAR_CLASSES, CAR_MODELS } from "@/lib/class-tiers";

interface FormState {
  title: string;
  date: string;
  game: string;
  track: string;
  cars: string[];
  description: string;
}

const initialState: FormState = {
  title: "",
  date: "",
  game: "",
  track: "",
  cars: [""],
  description: "",
};

export default function CreateEventForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    if (name.startsWith("cars-")) {
      const index = parseInt(name.replace("cars-", ""), 10);
      setForm((prev) => ({
        ...prev,
        cars: prev.cars.map((c, i) => (i === index ? value : c)),
      }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
    setError(null);
  }

  function addCarClass() {
    if (form.cars.length < 5) {
      setForm((prev) => ({ ...prev, cars: [...prev.cars, ""] }));
    }
  }

  function removeCarClass(index: number) {
    setForm((prev) => ({
      ...prev,
      cars: prev.cars.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let imagePath: string | undefined;

      // Upload image if selected
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);

        const uploadRes = await fetch("/api/admin/upload/image", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const data = await uploadRes.json();
          throw new Error(data.error ?? "Erreur lors de l'upload de l'image");
        }

        const uploadData = await uploadRes.json();
        imagePath = uploadData.filePath;
      }

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          cars: form.cars.filter(c => c.trim()),
          date: new Date(form.date).toISOString(),
          description: form.description || undefined,
          image: imagePath,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Une erreur est survenue");
      }

      setSuccess(true);
      setForm(initialState);
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
          id="title"
          name="title"
          type="text"
          required
          value={form.title}
          onChange={handleChange}
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
          id="date"
          name="date"
          type="datetime-local"
          required
          value={form.date}
          onChange={handleChange}
          className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
        />
      </div>

      {/* Game / Track */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="game" className="block text-sm font-medium text-brand-text mb-1.5">
            Jeu <span className="text-brand-orange">*</span>
          </label>
          <input
            id="game"
            name="game"
            type="text"
            required
            value={form.game}
            onChange={handleChange}
            placeholder="Gran Turismo 7"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
          />
        </div>
        <div>
          <label htmlFor="track" className="block text-sm font-medium text-brand-text mb-1.5">
            Circuit <span className="text-brand-orange">*</span>
          </label>
          <input
            id="track"
            name="track"
            type="text"
            required
            value={form.track}
            onChange={handleChange}
            placeholder="Spa-Francorchamps"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
          />
        </div>
      </div>

      {/* Car Classes / Voitures */}
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Voiture / Classe <span className="text-brand-orange">*</span>{" "}
          <span className="text-brand-muted font-normal">(jusqu'à 5 selections)</span>
        </label>
        <div className="space-y-2.5">
          {form.cars.map((carValue, idx) => (
            <div key={idx} className="flex gap-2">
              <select
                name={`cars-${idx}`}
                value={carValue}
                onChange={handleChange}
                className="flex-1 px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors"
              >
                <option value="">Sélectionner une classe ou voiture...</option>
                {CAR_CLASSES.map((carClass) => (
                  <optgroup key={carClass} label={`${carClass} (classe générale)`}>
                    <option value={carClass} className="font-semibold">
                      ★ {carClass}
                    </option>
                    {CAR_MODELS[carClass].map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {form.cars.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCarClass(idx)}
                  className="px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-muted hover:text-brand-orange hover:border-brand-orange transition-colors"
                  title="Supprimer cette classe"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {form.cars.length < 5 && (
          <button
            type="button"
            onClick={addCarClass}
            className="mt-2.5 text-sm text-brand-orange hover:text-brand-orange/80 transition-colors"
          >
            + Ajouter une classe / voiture
          </button>
        )}
      </div>

      {/* Image Upload */}
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Image de la course{" "}
          <span className="text-brand-muted font-normal">(optionnel, max 20MB)</span>
        </label>
        <ImageUpload onImageSelect={setImageFile} />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-brand-text mb-1.5">
          Description{" "}
          <span className="text-brand-muted font-normal">(optionnel)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          value={form.description}
          onChange={handleChange}
          placeholder="Règles, informations importantes sur la course..."
          className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange transition-colors resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading || success}
        className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-lg bg-brand-orange hover:bg-brand-orange/80 disabled:bg-brand-orange/50 text-white font-semibold transition-colors"
      >
        {loading && (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {loading ? "Création en cours..." : "Créer l'événement"}
      </button>
    </form>
  );
}
