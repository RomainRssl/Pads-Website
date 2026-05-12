"use client";
import { useEffect, useState } from "react";

interface Event { id:string; title:string; date:string; game:string; track:string; car:string; description?:string|null }

function useCountdown(d:string){
  const [diff,setDiff]=useState(0);
  useEffect(()=>{
    const u=()=>setDiff(new Date(d).getTime()-Date.now());
    u(); const id=setInterval(u,1000); return()=>clearInterval(id);
  },[d]);
  return { days:Math.floor(diff/86400000), hours:Math.floor((diff%86400000)/3600000),
           minutes:Math.floor((diff%3600000)/60000), seconds:Math.floor((diff%60000)/1000), isPast:diff<0 };
}

export default function EventCard({ event }:{ event:Event }) {
  const cd = useCountdown(event.date);
  const fmt = new Intl.DateTimeFormat("fr-FR",{weekday:"short",day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(event.date));
  return (
    <div className="bg-brand-card border border-brand-border border-l-2 border-l-brand-orange rounded-sm p-5 flex justify-between items-start gap-4 hover:border-brand-orange/50 transition-colors">
      <div className="flex-1 min-w-0">
        <span className="badge-game mb-2">{event.game}</span>
        <h3 className="font-heading font-bold text-xl uppercase text-brand-text leading-tight mb-1 truncate">{event.title}</h3>
        <p className="font-body text-sm text-brand-muted mb-3 flex items-center gap-1.5">
          <svg className="w-3 h-3 text-brand-orange flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          {event.track}
        </p>
        <span className="badge-muted">{event.car}</span>
        {event.description && <p className="font-body text-xs text-brand-muted mt-3 line-clamp-2">{event.description}</p>}
      </div>
      <div className="text-right flex-shrink-0">
        {cd.isPast ? (
          <span className="font-heading font-bold text-xs uppercase tracking-widest text-brand-muted">Terminé</span>
        ) : (
          <>
            <p className="font-heading text-[10px] uppercase tracking-[0.14em] text-brand-muted mb-1">Dans</p>
            {cd.days > 0 ? (
              <><p className="font-heading font-bold text-4xl text-brand-orange leading-none">{cd.days}</p>
              <p className="font-heading text-[10px] uppercase tracking-widest text-brand-muted">jours</p></>
            ) : (
              <p className="font-heading font-bold text-2xl text-brand-orange leading-none tabular-nums">
                {String(cd.hours).padStart(2,"0")}:{String(cd.minutes).padStart(2,"0")}:{String(cd.seconds).padStart(2,"0")}
              </p>
            )}
            <p className="font-body text-[11px] text-brand-muted mt-2">{fmt}</p>
          </>
        )}
      </div>
    </div>
  );
}
