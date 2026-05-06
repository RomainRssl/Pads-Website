import { prisma } from "@/lib/prisma";
import Link from "next/link";
import EventTable from "@/components/admin/EventTable";

export default async function AdminPage() {
  const events = await prisma.event.findMany({
    orderBy: { date: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-white">
            Tableau de bord
          </h1>
          <p className="text-brand-muted mt-1">
            {events.length} événement{events.length !== 1 ? "s" : ""} au total
          </p>
        </div>
        <Link
          href="/admin/create"
          className="px-4 py-2.5 rounded-lg bg-brand-orange hover:bg-brand-orange/80 text-white font-semibold text-sm transition-colors"
        >
          + Nouvelle course
        </Link>
      </div>

      <EventTable initialEvents={events} />
    </div>
  );
}
