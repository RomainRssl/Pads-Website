"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Event { id:string; title:string; date:Date|string; game:string; track:string; car:string }

export default function EventTable({ events }:{ events:Event[] }) {
  const router = useRouter();
  const [deleting,setDeleting] = useState<string|null>(null);
  const handleDelete=async(id:string)=>{ if(!confirm("Supprimer ?")) return; setDeleting(id); await fetch(`/api/events/${id}`,{method:"DELETE"}); setDeleting(null); router.refresh(); };
  if(events.length===0) return <div className="card p-12 text-center"><p className="font-heading font-semibold text-sm uppercase tracking-widest text-brand-muted">Aucun événement</p></div>;
  return (
    <div className="card overflow-hidden">
      <table className="table-racing">
        <thead><tr><th>Titre</th><th>Jeu</th><th>Circuit</th><th>Voiture</th><th>Date</th><th>Statut</th><th className="text-right">Action</th></tr></thead>
        <tbody>
          {events.map(e=>{
            const isPast=new Date(e.date)<new Date();
            return(
              <tr key={e.id}>
                <td className="font-heading font-bold text-sm uppercase">{e.title}</td>
                <td><span className="badge-game">{e.game}</span></td>
                <td className="text-brand-muted text-xs">{e.track}</td>
                <td className="text-brand-muted text-xs">{e.car}</td>
                <td className="font-body text-xs text-brand-muted">{new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(e.date))}</td>
                <td><span className={`font-heading font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${isPast?"text-brand-muted border-brand-border bg-brand-surface":"text-green-400 border-green-900/40 bg-green-950/30"}`}>{isPast?"Passé":"À venir"}</span></td>
                <td className="text-right"><button onClick={()=>handleDelete(e.id)} disabled={deleting===e.id} className="btn-danger text-[11px] py-1 px-3">{deleting===e.id?"…":"Supprimer"}</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
