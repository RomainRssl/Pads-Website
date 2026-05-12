"use client";
import { useState, useEffect } from "react";

interface TickerItem { id: string; text: string; active: boolean }

export default function AdminTickerPage() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    const res = await fetch("/api/ticker");
    const data = await res.json();
    setItems(data);
  };

  useEffect(() => { loadItems(); }, []);

  const add = async () => {
    if (!text.trim()) return;
    setLoading(true);
    await fetch("/api/ticker", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
    setText("");
    await loadItems();
    setLoading(false);
  };

  const remove = async (id: string) => {
    await fetch("/api/ticker/" + id, { method: "DELETE" });
    await loadItems();
  };

  const toggle = async (id: string, active: boolean) => {
    await fetch("/api/ticker/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) });
    await loadItems();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-heading font-bold text-white mb-6">Bandeau dynamique</h1>
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Nouveau texte..."
          className="flex-1 bg-brand-surface border border-brand-border text-white px-4 py-2 rounded-lg focus:outline-none focus:border-brand-orange"
        />
        <button onClick={add} disabled={loading || !text.trim()} className="px-4 py-2 bg-brand-orange text-white rounded-lg font-bold hover:bg-brand-orange/80 disabled:opacity-40">
          Ajouter
        </button>
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between bg-brand-surface border border-brand-border rounded-lg px-4 py-3">
            <span className={"text-sm " + (item.active ? "text-white" : "text-brand-muted line-through")}>{item.text}</span>
            <div className="flex gap-2">
              <button onClick={() => toggle(item.id, item.active)} className={"px-3 py-1 rounded text-xs font-bold " + (item.active ? "bg-green-900/40 text-green-400 border border-green-900" : "bg-brand-border text-brand-muted")}>
                {item.active ? "Actif" : "Inactif"}
              </button>
              <button onClick={() => remove(item.id)} className="px-3 py-1 rounded text-xs font-bold bg-red-900/40 text-red-400 border border-red-900">
                Supprimer
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-brand-muted text-sm">Aucun item. Ajoutez-en un !</p>}
      </div>
    </div>
  );
}
