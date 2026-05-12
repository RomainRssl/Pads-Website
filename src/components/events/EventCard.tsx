import type { Event } from "@prisma/client";
import EventBadge from "./EventBadge";

interface EventCardProps {
  event: Event;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  }).format(new Date(date));
}

function getDaysUntil(date: Date): number {
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function EventCard({ event }: EventCardProps) {
  const daysUntil = getDaysUntil(event.date);
  const isToday = daysUntil === 0;
  const isTomorrow = daysUntil === 1;
  const isSoon = daysUntil <= 3;

  let countdownLabel = `Dans ${daysUntil} jours`;
  if (isToday) countdownLabel = "Aujourd'hui !";
  else if (isTomorrow) countdownLabel = "Demain !";

  const carClasses = typeof event.cars === 'string' ? JSON.parse(event.cars) : event.cars;

  return (
    <article className="group relative bg-brand-card border border-brand-border rounded-xl overflow-hidden hover:border-brand-orange/40 hover:shadow-orange-glow transition-all duration-300 animate-fade-in">
      {/* Racing stripe accent */}
      <div className="h-1 bg-gradient-to-r from-brand-orange via-brand-orange to-brand-orange" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-heading text-lg font-bold text-brand-text group-hover:text-white transition-colors leading-tight">
            {event.title}
          </h3>
          <span
            className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
              isToday || isTomorrow
                ? "bg-brand-orange text-white"
                : isSoon
                ? "bg-brand-orange/20 text-brand-orange border border-brand-orange/30"
                : "bg-brand-surface text-brand-muted border border-brand-border"
            }`}
          >
            {countdownLabel}
          </span>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <EventBadge label={event.game} variant="game" />
          <EventBadge label={event.track} variant="track" />
          {carClasses.map((carClass: string, idx: number) => (
            <EventBadge key={idx} label={carClass} variant="car" />
          ))}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-brand-muted text-sm leading-relaxed mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Date footer */}
        <div className="flex items-center gap-2 text-brand-muted text-sm border-t border-brand-border pt-3 mt-auto">
          <CalendarIcon />
          <time dateTime={new Date(event.date).toISOString()}>
            {formatDate(event.date)}
          </time>
        </div>
      </div>
    </article>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
      />
    </svg>
  );
}
