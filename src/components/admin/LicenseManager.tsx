"use client";

import { useState } from "react";

interface License { id: string; label: string; minXp: number; color: string; order: number; }

export default function LicenseManager({ initialLicenses }: { initialLicenses: License[] }) {
  const [licenses, setLicenses] = useState<License[]>(initialLicenses);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<License>>({});
  const [newData, setNewData] = useState({ id: "", label: "", minXp: 0, color: "#CD7F32" });
  const [error, setError] = useState("");

  async function saveEdit(id: string) {
    const res = await fetch(`/api/admin/licenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editData),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    const updated = await res.json();
    setLicenses((prev) => prev.map((l) => l.id === id ? updated : l).sort((a, b) => a.order - b.order));
    setEditingId(null);
  }

  async function deleteLicense(id: string) {
    if (!confirm(`Supprimer la licence "${id}" ?`)) return;
    await fetch(`/api/admin/licenses/${id}`, { method: "DELETE" });
    setLicenses((prev) => prev.filter((l) => l.id !== id));
  }

  async function addLicense(e: React.FormEvent) {
    e.preventDefault();
    if (!newData.id.trim() || !newData.label.trim()) return;
    const order = licenses.length;
    const res = await fetch("/api/admin/licenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newData, id: newData.id.trim().toUpperCase(), order }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    const created = await res.json();
    setLicenses((prev) => [...prev, created].sort((a, b) => a.order - b.order));
    setNewData({ id: "", label: "", minXp: 0, color: "#CD7F32" });
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="divide-y divide-brand-border">
        {licenses.map((lic) => (
          <div key={lic.id} className="py-4">
            {editingId === lic.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-brand-muted block mb-1">Label</label>
                    <input type="text" value={editData.label ?? lic.label}
                      onChange={(e) => setEditData((p) => ({ ...p, label: e.target.value }))}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-brand-text text-sm focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-brand-muted block mb-1">XP minimum</label>
                    <input type="number" value={editData.minXp ?? lic.minXp}
                      onChange={(e) => setEditData((p) => ({ ...p, minXp: Number(e.target.value) }))}
                      className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-brand-text text-sm focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-brand-muted block mb-1">Couleur</label>
                  <div className="flex items-center gap-3">
                    <input type="color" value={editData.color ?? lic.color}
                      onChange={(e) => setEditData((p) => ({ ...p, color: e.target.value }))}
                      className="w-10 h-8 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-sm text-brand-muted">{editData.color ?? lic.color}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(lic.id)} className="px-4 py-1.5 rounded-lg bg-brand-orange text-white text-sm font-semibold">Enregistrer</button>
                  <button onClick={() => setEditingId(null)} className="px-4 py-1.5 rounded-lg border border-brand-border text-brand-muted text-sm">Annuler</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: lic.color }} />
                <div className="flex-1">
                  <span className="font-bold text-white" style={{ color: lic.color }}>{lic.label}</span>
                  <span className="text-brand-muted text-sm ml-3">à partir de {lic.minXp.toLocaleString("fr-FR")} XP</span>
                </div>
                <button onClick={() => { setEditingId(lic.id); setEditData({ label: lic.label, minXp: lic.minXp, color: lic.color, order: lic.order }); setError(""); }}
                  className="text-xs text-brand-muted hover:text-white transition-colors">Modifier</button>
                <button onClick={() => deleteLicense(lic.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors">Supprimer</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <form onSubmit={addLicense} className="pt-4 border-t border-brand-border space-y-3">
        <p className="text-sm font-semibold text-white">Ajouter un niveau</p>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" placeholder="ID (ex: DIAMOND)" value={newData.id}
            onChange={(e) => setNewData((p) => ({ ...p, id: e.target.value }))}
            className="bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-brand-text text-sm focus:outline-none focus:border-brand-orange placeholder:text-brand-muted"
          />
          <input type="number" placeholder="XP minimum" value={newData.minXp}
            onChange={(e) => setNewData((p) => ({ ...p, minXp: Number(e.target.value) }))}
            className="bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-brand-text text-sm focus:outline-none focus:border-brand-orange"
          />
        </div>
        <div className="flex items-center gap-3">
          <input type="color" value={newData.color}
            onChange={(e) => setNewData((p) => ({ ...p, color: e.target.value }))}
            className="w-10 h-8 rounded cursor-pointer bg-transparent border-0"
          />
          <button type="submit" className="px-4 py-2 rounded-lg bg-brand-orange hover:bg-brand-orange/80 text-white text-sm font-semibold transition-colors">
            + Ajouter
          </button>
        </div>
      </form>
    </div>
  );
}
