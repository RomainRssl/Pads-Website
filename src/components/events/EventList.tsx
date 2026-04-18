import type { Event } from "@prisma/client";
import EventCard from "./EventCard";

interface EventListProps {
  events: Event[];
}

export default function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🏁</p>
        <p className="font-heading text-xl text-brand-muted">
          Aucune course planifiée pour le moment
        </p>
        <p className="text-brand-muted text-sm mt-2">
          Revenez bientôt pour les prochains événements !
        </p>
      </div>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-4 mb-8">
        <h2 className="font-heading text-3xl font-bold text-white">
          Prochaines courses
        </h2>
        <span className="px-2.5 py-0.5 rounded-full bg-brand-red/10 border border-brand-red/30 text-brand-red text-sm font-semibold">
          {events.length}
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </section>
  );
}
