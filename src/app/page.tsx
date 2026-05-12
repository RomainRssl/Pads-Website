import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/layout/Hero";
import EventCard from "@/components/events/EventCard";

export const revalidate = 60;

export default async function HomePage() {
  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });

  return (
    <main className="min-h-screen bg-brand-navy pt-16">
      <Navbar />
      <Hero />
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-0.5 h-5 bg-brand-orange" />
          <h2 className="font-heading font-bold text-lg uppercase tracking-widest text-brand-text">
            Prochaines courses
          </h2>
          <span className="font-heading text-xs text-brand-muted ml-auto">{events.length} à venir</span>
        </div>
        {events.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-heading font-semibold text-sm uppercase tracking-widest text-brand-muted">
              Aucune course planifiée
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>
      <footer className="border-t border-brand-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="font-heading font-semibold text-xs uppercase tracking-widest text-brand-muted">
            Par amour du spin © {new Date().getFullYear()}
          </p>
          <p className="font-heading text-xs text-brand-muted">Communauté Sim Racing</p>
        </div>
      </footer>
    </main>
  );
}
