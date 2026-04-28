"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface FormState {
  title: string;
  date: string;
  game: string;
  track: string;
  car: string;
  description: string;
}

const initialState: FormState = {
  title: "",
  date: "",
  game: "",
  track: "",
  car: "",
  description: "",
};

export default function CreateEventForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(initialState);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImagePreview(null);
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

      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          date: new Date(form.date).toISOString(),
          description: form.description || undefined,
          imageUrl: imageUrl || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Une erreur est survenue");
      }

      setSuccess(true);
      setForm(initialState);
      setImageFile(null);
      setImagePreview(null);
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
        <div className="p-4 rounded-lg bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-brand-text mb-1.5">
          Titre de la course <span className="text-brand-red">*</span>
        </label>
        <input
          id="title" name="title" type="text" required
          value={form.title} onChange={handleChange}
          placeholder="Gran Turismo World Series — Manche 3"
          className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
        />
      </div>

      {/* Date */}
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-brand-text mb-1.5">
          Date et heure <span className="text-brand-red">*</span>
        </label>
        <input
          id="date" name="date" type="datetime-local" required
          value={form.date} onChange={handleChange}
          className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
        />
      </div>

      {/* Game / Track / Car — 3 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="game" className="block text-sm font-medium text-brand-text mb-1.5">
            Jeu <span className="text-brand-red">*</span>
          </label>
          <input
            id="game" name="game" type="text" required
            value={form.game} onChange={handleChange}
            placeholder="Gran Turismo 7"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
          />
        </div>
        <div>
          <label htmlFor="track" className="block text-sm font-medium text-brand-text mb-1.5">
            Circuit <span className="text-brand-red">*</span>
          </label>
          <input
            id="track" name="track" type="text" required
            value={form.track} onChange={handleChange}
            placeholder="Spa-Francorchamps"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
          />
        </div>
        <div>
          <label htmlFor="car" className="block text-sm font-medium text-brand-text mb-1.5">
            Voiture <span className="text-brand-red">*</span>
          </label>
          <input
            id="car" name="car" type="text" required
            value={form.car} onChange={handleChange}
            placeholder="Porsche 911 GT3"
            className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors"
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
          className="w-full px-4 py-2.5 rounded-lg bg-brand-surface border border-brand-border text-brand-text placeholder-brand-muted focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-colors resize-none"
        />
      </div>

      {/* Image */}
      <div>
        <label className="block text-sm font-medium text-brand-text mb-1.5">
          Image de l&apos;annonce <span className="text-brand-muted font-normal">(optionnel · JPG, PNG, WebP, GIF · max 5 Mo)</span>
        </label>
        {imagePreview && (
          <div className="mb-3 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Aperçu" className="w-full max-h-48 object-cover rounded-lg border border-brand-border" />
            <button
              type="button"
              onClick={() => { setImageFile(null); setImagePreview(null); if (fileRef.current) fileRef.current.value = ""; }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-brand-dark/80 border border-brand-border text-brand-muted hover:text-white flex items-center justify-center text-sm transition-colors"
            >×</button>
          </div>
        )}
        <div
          className="border-2 border-dashed border-brand-border rounded-xl p-6 text-center cursor-pointer hover:border-brand-red/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <p className="text-brand-muted text-sm">Cliquez pour choisir une image</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || success}
        className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-lg bg-brand-red hover:bg-brand-red/80 disabled:bg-brand-red/50 text-white font-semibold transition-colors"
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
