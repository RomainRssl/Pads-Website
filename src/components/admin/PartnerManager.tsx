"use client";

import { useState } from "react";

interface Partner {
  id: string;
  name: string;
  url: string | null;
  logoUrl: string | null;
  discountCode: string | null;
  description: string | null;
  order: number;
}

const EMPTY = { name: "", url: "", logoUrl: "", discountCode: "", description: "" };

export default function PartnerManager({ initialPartners }: { initialPartners: Partner[] }) {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/partners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const created: Partner = await res.json();
    setPartners((prev) => [...prev, created]);
    setForm(EMPTY);
  }

  function startEdit(p: Partner) {
    setEditingId(p.id);
    setEditForm({ name: p.name, url: p.url ?? "", logoUrl: p.logoUrl ?? "", discountCode: p.discountCode ?? "", description: p.description ?? "" });
  }

  async function handleSaveEdit(id: string) {
    const res = await fetch(`/api/partners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    const updated: Partner = await res.json();
    setPartners((prev) => prev.map((p) => (p.id === id ? updated : p)));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/partners/${id}`, { method: "DELETE" });
    setPartners((prev) => prev.filter((p) => p.id !== id));
    setDeleting(null);
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Add form */}
      <div className="bg-brand-surface border border-brand-border rounded-2xl p-6">
        <h2 className="font-heading font-bold text-white text-lg mb-5">Ajouter un partenaire</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required placeholder="Nom du partenaire" />
          <Field label="Site web (URL)" value={form.url} onChange={(v) => setForm({ ...form, url: v })} placeholder="https://…" type="url" />
          <Field label="Logo (URL image)" value={form.logoUrl} onChange={(v) => setForm({ ...form, logoUrl: v })} placeholder="https://…" type="url" />
          <Field label="Code réduction" value={form.discountCode} onChange={(v) => setForm({ ...form, discountCode: v })} placeholder="PADS10" />
          <div className="sm:col-span-2">
            <label className="block text-xs text-brand-muted uppercase font-semibold tracking-wider mb-1.5">Texte additionnel</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description du partenaire…"
              rows={3}
              className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-orange resize-none"
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="px-5 py-2 rounded-lg bg-brand-orange text-black text-sm font-bold hover:bg-brand-orange/90 transition-colors">
              Ajouter
            </button>
          </div>
        </form>
      </div>

      {/* Partner list */}
      {partners.length === 0 ? (
        <p className="text-brand-muted text-sm text-center py-6">Aucun partenaire pour l'instant.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {partners.map((p) =>
            editingId === p.id ? (
              <div key={p.id} className="bg-brand-surface border border-brand-orange/40 rounded-xl p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Field label="Nom" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} required placeholder="Nom" />
                  <Field label="Site web (URL)" value={editForm.url} onChange={(v) => setEditForm({ ...editForm, url: v })} placeholder="https://…" type="url" />
                  <Field label="Logo (URL image)" value={editForm.logoUrl} onChange={(v) => setEditForm({ ...editForm, logoUrl: v })} placeholder="https://…" type="url" />
                  <Field label="Code réduction" value={editForm.discountCode} onChange={(v) => setEditForm({ ...editForm, discountCode: v })} placeholder="PADS10" />
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-brand-muted uppercase font-semibold tracking-wider mb-1.5">Texte additionnel</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-orange resize-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveEdit(p.id)} className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-xs font-bold hover:bg-green-500 transition-colors">Sauvegarder</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-1.5 rounded-lg border border-brand-border text-brand-muted text-xs hover:text-white transition-colors">Annuler</button>
                </div>
              </div>
            ) : (
              <div key={p.id} className="bg-brand-surface border border-brand-border rounded-xl px-5 py-4 flex items-center gap-4">
                {p.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoUrl} alt={p.name} className="w-14 h-14 object-contain rounded-lg bg-brand-dark p-1 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">{p.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                    {p.url && <p className="text-brand-muted text-xs truncate">{p.url}</p>}
                    {p.discountCode && <p className="text-brand-orange text-xs font-mono font-bold">{p.discountCode}</p>}
                  </div>
                  {p.description && <p className="text-brand-muted text-xs mt-1 truncate">{p.description}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => startEdit(p)} className="px-3 py-1.5 rounded-lg border border-brand-border text-brand-muted text-xs hover:text-white transition-colors">Modifier</button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deleting === p.id}
                    className="px-3 py-1.5 rounded-lg border border-red-800/50 text-red-400 text-xs hover:bg-red-900/20 transition-colors disabled:opacity-50"
                  >
                    {deleting === p.id ? "…" : "Supprimer"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <div>
      <label className="block text-xs text-brand-muted uppercase font-semibold tracking-wider mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-orange"
      />
    </div>
  );
}
