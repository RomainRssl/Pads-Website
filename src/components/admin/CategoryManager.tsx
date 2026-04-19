"use client";

import { useState } from "react";

interface Category { id: string; name: string; order: number; }

export default function CategoryManager({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setCategories((prev) => [...prev, data]);
    setNewName("");
  }

  async function deleteCategory(id: string, name: string) {
    if (!confirm(`Supprimer la catégorie "${name}" ? Elle sera retirée de tous les pilotes.`)) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={addCategory} className="flex gap-3">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom de la catégorie (ex: LMGT3)"
          className="flex-1 bg-brand-dark border border-brand-border rounded-lg px-4 py-2.5 text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-red text-sm"
        />
        <button type="submit" disabled={!newName.trim()}
          className="px-5 py-2.5 rounded-lg bg-brand-red hover:bg-brand-red/80 text-white font-semibold text-sm transition-colors disabled:opacity-50">
          + Ajouter
        </button>
      </form>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {categories.length === 0 ? (
        <p className="text-brand-muted text-sm">Aucune catégorie. Ajoutez des catégories (LMGT3, GTE, LMP3…) pour les attribuer aux pilotes.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-red/10 border border-brand-red/30">
              <span className="text-brand-red font-bold text-sm">{cat.name}</span>
              <button onClick={() => deleteCategory(cat.id, cat.name)} className="text-red-400 hover:text-red-300 text-xs ml-1 transition-colors">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
