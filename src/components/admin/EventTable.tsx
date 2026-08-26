"use client";

import { useState, useRef } from "react";
import type { Event } from "@prisma/client";
import EventBadge from "@/components/events/EventBadge";
import { useTrackGroups } from "@/lib/use-track-groups";

interface EventTableProps {
  initialEvents: Event[];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(date));
}

function toDatetimeLocal(date: Date): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventTable({ initialEvents }: EventTableProps) {
  const trackGroups = useTrackGroups();
  const [events, setEvents] = useState(initialEvents);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingPast, setDeletingPast] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Event & { dateLocal: string }>>({});
  const [saving, setSaving] = useState(false);
  const [editImage, setEditImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [posterBusy, setPosterBusy] = useState<string | null>(null);
  const [posterMsg, setPosterMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) setEvents((prev) => prev.filter((e) => e.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  async function handleDeletePast() {
    const past = events.filter((e) => new Date(e.date) < new Date());
    if (past.length === 0) { alert("Aucune course terminée à supprimer."); return; }
    if (!confirm(`Supprimer ${past.length} course${past.length > 1 ? "s" : ""} terminée${past.length > 1 ? "s" : ""} ?`)) return;
    setDeletingPast(true);
    try {
      const res = await fetch("/api/events/past", { method: "DELETE" });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => new Date(e.date) >= new Date()));
      }
    } finally {
      setDeletingPast(false);
    }
  }

  function startEdit(event: Event) {
    setEditing(event.id);
    setEditData({ ...event, dateLocal: toDatetimeLocal(event.date) });
    setEditImage(null);
    setEditImagePreview(null);
  }

  function cancelEdit() {
    setEditing(null);
    setEditData({});
    setEditImage(null);
    setEditImagePreview(null);
  }

  async function handleSave(id: string) {
    setSaving(true);
    try {
      let imageUrl = editData.imageUrl;

      // Upload new image if selected
      if (editImage) {
        const fd = new FormData();
        fd.append("file", editImage);
        const uploadRes = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!uploadRes.ok) {
          const d = await uploadRes.json();
          throw new Error(d.error ?? "Erreur upload image");
        }
        const d = await uploadRes.json();
        imageUrl = d.url;
      }

      // L'API attend un tableau : le champ édite la chaîne JSON stockée
      let cars: unknown = editData.cars;
      if (typeof cars === "string") {
        try { cars = JSON.parse(cars); } catch { throw new Error("Le champ Voiture(s) doit être un JSON valide."); }
      }

      const body = {
        title:          editData.title,
        date:           editData.dateLocal ? new Date(editData.dateLocal).toISOString() : undefined,
        game:           editData.game,
        track:          editData.track,
        cars,
        description:    editData.description,
        imageUrl:       imageUrl ?? null,
        serverName:     editData.serverName ?? null,
        serverPassword: editData.serverPassword ?? null,
        weekNumber:     editData.weekNumber ?? null,
        posterAccent:   editData.posterAccent ?? null,
        entryCredits:   editData.entryCredits ?? null,
        raceDuration:   editData.raceDuration ?? null,
      };

      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Erreur lors de la sauvegarde");
      }

      const updated = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
      cancelEdit();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  }

  async function handleGeneratePoster(id: string, force: boolean) {
    setPosterBusy(id);
    setPosterMsg(null);
    try {
      const res = await fetch(`/api/admin/events/${id}/poster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      const d = await res.json();
      setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...d } : e)));
      setEditData((p) => (editing === id ? { ...p, ...d } : p));
      if (d.statut === "QUEUED") setPosterMsg(d.message ?? "Génération remise en file.");
      else if (d.statut === "FAILED") setPosterMsg(d.message ?? "La génération a échoué.");
      else setPosterMsg(null);
    } catch {
      setPosterMsg("Erreur réseau pendant la génération.");
    } finally {
      setPosterBusy(null);
    }
  }

  async function handlePublishDiscord(id: string) {
    setPosterBusy(id);
    setPosterMsg(null);
    try {
      const res = await fetch(`/api/admin/events/${id}/poster/discord`, { method: "POST" });
      const d = await res.json();
      setPosterMsg(res.ok ? "Affiche publiée sur Discord ✓" : d.error ?? "Échec de la publication.");
    } catch {
      setPosterMsg("Erreur réseau pendant la publication.");
    } finally {
      setPosterBusy(null);
    }
  }

  const POSTER_LABELS: Record<string, string> = {
    NONE: "Aucune affiche",
    QUEUED: "En file (quota Gemini) — réessai automatique",
    SCENE_OK: "Visuel généré, rendu en attente",
    READY: "Prête",
    FAILED: "Échec",
    PURGED: "Purgée (course terminée)",
  };

  const pastCount = events.filter((e) => new Date(e.date) < new Date()).length;

  if (events.length === 0) {
    return (
      <div className="text-center py-12 border border-brand-border rounded-xl">
        <p className="text-brand-muted">Aucun événement. Créez le premier !</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Delete past button */}
      {pastCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={handleDeletePast}
            disabled={deletingPast}
            className="px-4 py-2 rounded-lg text-xs font-medium border border-brand-border text-brand-muted hover:text-brand-red hover:border-brand-red/50 disabled:opacity-50 transition-colors"
          >
            {deletingPast ? "Suppression…" : `🗑 Supprimer les ${pastCount} course${pastCount > 1 ? "s" : ""} terminée${pastCount > 1 ? "s" : ""}`}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-brand-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-surface">
              <th className="text-left px-4 py-3 font-semibold text-brand-muted">Titre</th>
              <th className="text-left px-4 py-3 font-semibold text-brand-muted hidden sm:table-cell">Jeu</th>
              <th className="text-left px-4 py-3 font-semibold text-brand-muted hidden md:table-cell">Circuit</th>
              <th className="text-left px-4 py-3 font-semibold text-brand-muted">Date</th>
              <th className="text-right px-4 py-3 font-semibold text-brand-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => {
              const isPast = new Date(event.date) < new Date();
              if (editing === event.id) {
                return (
                  <tr key={event.id} className="border-b border-brand-border bg-brand-surface/30">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Titre</label>
                          <input
                            type="text"
                            value={editData.title ?? ""}
                            onChange={(e) => setEditData((p) => ({ ...p, title: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Date et heure</label>
                          <input
                            type="datetime-local"
                            value={editData.dateLocal ?? ""}
                            onChange={(e) => setEditData((p) => ({ ...p, dateLocal: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Jeu</label>
                          <input
                            type="text"
                            value={editData.game ?? ""}
                            onChange={(e) => setEditData((p) => ({ ...p, game: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Circuit</label>
                          <select
                            value={editData.track ?? ""}
                            onChange={(e) => setEditData((p) => ({ ...p, track: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-red"
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
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Voiture(s)</label>
                          <input
                            type="text"
                            value={editData.cars ?? ""}
                            onChange={(e) => setEditData((p) => ({ ...p, cars: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Description</label>
                          <input
                            type="text"
                            value={editData.description ?? ""}
                            onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Nom du serveur</label>
                          <input
                            type="text"
                            value={editData.serverName ?? ""}
                            onChange={(e) => setEditData((p) => ({ ...p, serverName: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Mot de passe</label>
                          <input
                            type="text"
                            value={editData.serverPassword ?? ""}
                            onChange={(e) => setEditData((p) => ({ ...p, serverPassword: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Semaine (affiche)</label>
                          <input
                            type="number" min={1} max={53}
                            value={editData.weekNumber ?? ""}
                            onChange={(e) => setEditData((p) => ({ ...p, weekNumber: e.target.value === "" ? null : parseInt(e.target.value, 10) }))}
                            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Inscription (crédits)</label>
                          <input
                            type="number" min={0}
                            value={editData.entryCredits ?? ""}
                            onChange={(e) => setEditData((p) => ({ ...p, entryCredits: e.target.value === "" ? null : parseInt(e.target.value, 10) }))}
                            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Durée de course (minutes)</label>
                          <input
                            type="number" min={1}
                            value={editData.raceDuration ?? ""}
                            onChange={(e) => setEditData((p) => ({ ...p, raceDuration: e.target.value === "" ? null : parseInt(e.target.value, 10) }))}
                            className="w-full px-3 py-2 rounded-lg bg-brand-dark border border-brand-border text-brand-text text-sm focus:outline-none focus:border-brand-red"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-brand-muted mb-1 block">Couleur d&apos;accent (affiche)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={editData.posterAccent ?? "#F07000"}
                              onChange={(e) => setEditData((p) => ({ ...p, posterAccent: e.target.value }))}
                              className="h-9 w-12 rounded-lg bg-brand-dark border border-brand-border cursor-pointer"
                            />
                            <span className="font-mono text-xs text-brand-muted">{editData.posterAccent ?? "#F07000"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Image edit */}
                      <div className="mb-3">
                        <label className="text-xs text-brand-muted mb-1 block">Image (optionnel)</label>
                        <div className="flex items-center gap-3 flex-wrap">
                          {(editImagePreview ?? editData.imageUrl) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={editImagePreview ?? editData.imageUrl ?? ""}
                              alt="aperçu"
                              className="h-16 rounded-lg border border-brand-border object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="px-3 py-1.5 rounded-lg border border-brand-border text-brand-muted text-xs hover:text-white transition-colors"
                          >
                            {editData.imageUrl || editImagePreview ? "Changer l'image" : "Ajouter une image"}
                          </button>
                          {(editData.imageUrl || editImagePreview) && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditImage(null);
                                setEditImagePreview(null);
                                setEditData((p) => ({ ...p, imageUrl: null }));
                                if (fileRef.current) fileRef.current.value = "";
                              }}
                              className="text-xs text-brand-muted hover:text-red-400 transition-colors"
                            >
                              Supprimer l&apos;image
                            </button>
                          )}
                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] ?? null;
                              setEditImage(file);
                              setEditImagePreview(file ? URL.createObjectURL(file) : null);
                            }}
                          />
                        </div>
                      </div>

                      {/* Affiche FIS */}
                      <div className="mb-3 border border-brand-border rounded-xl p-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-xs text-brand-muted">Affiche :</span>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            event.posterStatus === "READY"
                              ? "bg-green-500/10 border-green-500/40 text-green-400"
                              : event.posterStatus === "FAILED"
                              ? "bg-brand-orange/10 border-brand-orange/40 text-brand-orange"
                              : "bg-brand-surface border-brand-border text-brand-muted"
                          }`}>
                            {POSTER_LABELS[event.posterStatus ?? "NONE"] ?? event.posterStatus}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleGeneratePoster(event.id, false)}
                            disabled={posterBusy === event.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-orange/10 border border-brand-orange/30 text-brand-orange hover:bg-brand-orange/20 disabled:opacity-40 transition-colors"
                          >
                            {posterBusy === event.id ? "Génération…" : "Générer l'affiche"}
                          </button>
                          {(event.posterStatus === "READY" || event.scenePath) && (
                            <button
                              type="button"
                              onClick={() => handleGeneratePoster(event.id, true)}
                              disabled={posterBusy === event.id}
                              className="px-3 py-1.5 rounded-lg text-xs border border-brand-border text-brand-muted hover:text-white disabled:opacity-40 transition-colors"
                            >
                              Régénérer (nouveau visuel)
                            </button>
                          )}
                          {event.posterStatus === "READY" && event.posterPath && (
                            <button
                              type="button"
                              onClick={() => handlePublishDiscord(event.id)}
                              disabled={posterBusy === event.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-discord/10 border border-brand-discord/40 text-brand-discord hover:bg-brand-discord/20 disabled:opacity-40 transition-colors"
                            >
                              Publier sur Discord
                            </button>
                          )}
                        </div>
                        {event.posterStatus === "FAILED" && event.posterError && (
                          <p className="text-xs text-brand-orange mt-2">{event.posterError}</p>
                        )}
                        {posterMsg && posterBusy === null && (
                          <p className="text-xs text-brand-muted mt-2">{posterMsg}</p>
                        )}
                        {event.posterStatus === "READY" && event.posterPath && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/media/${event.posterPath}?v=${event.posterAt ? new Date(event.posterAt).getTime() : 0}`}
                            alt="Aperçu de l'affiche"
                            className="mt-3 h-64 rounded-lg border border-brand-border"
                          />
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSave(event.id)}
                          disabled={saving}
                          className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-brand-red hover:bg-brand-red/80 text-white disabled:opacity-50 transition-colors"
                        >
                          {saving ? "Sauvegarde…" : "Sauvegarder"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="px-4 py-1.5 rounded-lg text-xs border border-brand-border text-brand-muted hover:text-white transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }

              return (
                <tr
                  key={event.id}
                  className={`border-b border-brand-border last:border-0 hover:bg-brand-surface/50 transition-colors ${isPast ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3 font-medium text-brand-text">
                    {event.title}
                    {isPast && <span className="ml-2 text-xs text-brand-muted">(terminée)</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <EventBadge label={event.game} variant="game" />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <EventBadge label={event.track} variant="track" />
                  </td>
                  <td className="px-4 py-3 text-brand-muted whitespace-nowrap">
                    {formatDate(event.date)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(event)}
                        className="px-3 py-1 rounded-lg text-xs font-medium border border-brand-border text-brand-muted hover:text-white hover:border-brand-text transition-colors"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        disabled={deleting === event.id}
                        className="px-3 py-1 rounded-lg text-xs font-medium border border-brand-red/30 text-brand-red hover:bg-brand-red/10 disabled:opacity-50 transition-colors"
                      >
                        {deleting === event.id ? "..." : "Supprimer"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
