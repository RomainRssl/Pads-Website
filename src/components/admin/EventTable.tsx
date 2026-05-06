"use client";

import { useState } from "react";
import type { Event } from "@prisma/client";
import EventBadge from "@/components/events/EventBadge";

interface EventTableProps {
  initialEvents: Event[];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default function EventTable({ initialEvents }: EventTableProps) {
  const [events, setEvents] = useState(initialEvents);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cet événement ?")) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }
    } finally {
      setDeleting(null);
    }
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 border border-brand-border rounded-xl">
        <p className="text-brand-muted">Aucun événement. Créez le premier !</p>
      </div>
    );
  }

  return (
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
          {events.map((event) => (
            <tr
              key={event.id}
              className="border-b border-brand-border last:border-0 hover:bg-brand-surface/50 transition-colors"
            >
              <td className="px-4 py-3 font-medium text-brand-text">
                {event.title}
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
                <button
                  onClick={() => handleDelete(event.id)}
                  disabled={deleting === event.id}
                  className="px-3 py-1 rounded-lg text-xs font-medium border border-brand-orange/30 text-brand-orange hover:bg-brand-orange/10 disabled:opacity-50 transition-colors"
                >
                  {deleting === event.id ? "..." : "Supprimer"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
