import { prisma } from "@/lib/prisma";
import EventTable from "@/components/admin/EventTable";

export default async function AdminPage() {
  const events  = await prisma.event.findMany({ orderBy:{ date:"asc" } });
  const players = await prisma.player.count();
  const sessions= await prisma.raceSession.count();
  return (
    <div className="space-y-8">
      <div>
        <div className="section-header"><div className="section-bar"/><h1 className="section-title">Dashboard</h1></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[{label:"Événements",value:events.length},{label:"Pilotes",value:players},{label:"Sessions",value:sessions},{label:"À venir",value:events.filter(e=>new Date(e.date)>new Date()).length}].map(s=>(
            <div key={s.label} className="stat-card"><span className="stat-value text-brand-orange">{s.value}</span><span className="stat-label">{s.label}</span></div>
          ))}
        </div>
      </div>
      <div>
        <div className="section-header"><div className="section-bar"/><h2 className="section-title">Tous les événements</h2></div>
        <EventTable initialEvents={events} />
      </div>
    </div>
  );
}
