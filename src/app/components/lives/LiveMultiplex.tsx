"use client";
import { useEffect, useState, useCallback } from "react";

interface Streamer { id:string; twitchUsername:string }
interface LiveInfo { username:string; isLive:boolean; viewers?:number; displayName?:string; profileImageUrl?:string }

const COLS: Record<number,string> = {1:"grid-cols-1",2:"grid-cols-2",3:"grid-cols-2",4:"grid-cols-2",5:"grid-cols-3",6:"grid-cols-3",7:"grid-cols-4",8:"grid-cols-4",9:"grid-cols-5",10:"grid-cols-5"};

export default function LiveMultiplex({ streamers }:{ streamers:Streamer[] }) {
  const [liveData,setLiveData] = useState<LiveInfo[]>([]);
  const [selected,setSelected] = useState<string[]>([]);
  const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN??"localhost";

  const fetchLive = useCallback(async()=>{ try{ const r=await fetch("/api/twitch/live"); if(r.ok) setLiveData(await r.json()); }catch{} },[]);
  useEffect(()=>{ fetchLive(); const id=setInterval(fetchLive,60000); return()=>clearInterval(id); },[fetchLive]);

  const toggle=(u:string)=>setSelected(p=>p.includes(u)?p.filter(x=>x!==u):p.length<10?[...p,u]:p);
  const sorted=[...streamers].sort((a,b)=>(liveData.find(l=>l.username===b.twitchUsername)?.isLive?1:0)-(liveData.find(l=>l.username===a.twitchUsername)?.isLive?1:0));
  const cols=COLS[Math.min(selected.length,10)]??"grid-cols-5";

  return (
    <div className="flex gap-4">
      <aside className="w-56 flex-shrink-0">
        <p className="font-heading font-bold text-xs uppercase tracking-widest text-brand-muted mb-3">Streamers ({selected.length}/10)</p>
        <div className="flex flex-col gap-1.5">
          {streamers.length===0&&<p className="font-body text-xs text-brand-muted">Aucun streamer</p>}
          {sorted.map(s=>{
            const info=liveData.find(l=>l.username===s.twitchUsername);
            const active=selected.includes(s.twitchUsername);
            return(
              <button key={s.id} onClick={()=>toggle(s.twitchUsername)} className={`flex items-center gap-2.5 px-3 py-2 rounded-sm border text-left transition-all ${active?"bg-brand-orange/10 border-brand-orange/40 text-brand-text":"bg-brand-card border-brand-border text-brand-muted hover:border-brand-orange/40 hover:text-brand-text"}`}>
                <div className="relative w-7 h-7 flex-shrink-0">
                  {info?.profileImageUrl?<img src={info.profileImageUrl} alt="" className="w-7 h-7 rounded-full"/>:<div className="w-7 h-7 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center"><span className="font-heading font-bold text-xs text-brand-orange">{s.twitchUsername[0].toUpperCase()}</span></div>}
                  {info?.isLive&&<span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-brand-navy"/>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-bold text-xs uppercase truncate">{info?.displayName??s.twitchUsername}</p>
                  {info?.isLive&&info.viewers!==undefined&&<p className="font-body text-[10px] text-red-400">{info.viewers.toLocaleString("fr-FR")} viewers</p>}
                </div>
                {info?.isLive&&<span className="font-heading font-bold text-[9px] uppercase tracking-wider text-red-400 bg-red-950/50 border border-red-900/40 px-1.5 py-0.5 rounded-sm flex-shrink-0">Live</span>}
              </button>
            );
          })}
        </div>
      </aside>
      <div className="flex-1 min-w-0">
        {selected.length===0?(
          <div className="card flex flex-col items-center justify-center h-64 gap-3">
            <svg className="w-10 h-10 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"/></svg>
            <p className="font-heading font-semibold text-sm uppercase tracking-widest text-brand-muted">Sélectionne un streamer</p>
          </div>
        ):(
          <div className={`grid ${cols} gap-2`}>
            {selected.map(u=>(
              <div key={u} className="relative aspect-video bg-brand-card rounded-sm overflow-hidden">
                <iframe src={`https://player.twitch.tv/?channel=${u}&parent=${domain}&muted=false`} className="w-full h-full" allowFullScreen/>
                <button onClick={()=>toggle(u)} className="absolute top-1.5 right-1.5 w-6 h-6 bg-brand-navy/80 rounded-full flex items-center justify-center text-brand-muted hover:text-brand-orange text-xs">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
