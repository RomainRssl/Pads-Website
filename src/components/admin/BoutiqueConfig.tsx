"use client";

import { useState, useEffect } from "react";

const DEFAULT_URL = "https://www.etsy.com/fr/shop/ParAmourDuSpin";

export default function BoutiqueConfig() {
  const [url, setUrl] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/site-config?key=boutique_url")
      .then((r) => r.json())
      .then((d) => {
        setUrl(d.value ?? DEFAULT_URL);
        setLoading(false);
      })
      .catch(() => {
        setUrl(DEFAULT_URL);
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/site-config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "boutique_url", value: url }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (loading) return <div className="text-brand-muted text-sm">Chargement…</div>;

  return (
    <form onSubmit={handleSave} className="bg-brand-surface border border-brand-border rounded-2xl p-6 max-w-xl flex flex-col gap-4">
      <div>
        <label className="block text-xs text-brand-muted uppercase font-semibold tracking-wider mb-1.5">
          URL de la boutique
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={DEFAULT_URL}
          required
          className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-orange"
        />
        <p className="text-xs text-brand-muted mt-1.5">Ce lien apparaît dans la navigation principale sous "Boutique PADS".</p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="px-5 py-2 rounded-lg bg-brand-orange text-black text-sm font-bold hover:bg-brand-orange/90 transition-colors"
        >
          Enregistrer
        </button>
        {saved && <span className="text-green-400 text-sm">✓ Sauvegardé</span>}
      </div>
    </form>
  );
}
