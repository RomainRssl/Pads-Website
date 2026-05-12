"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Streamer { id:string; twitchUsername:string }

export default function StreamerManager({ initialStreamers }:{ initialStreamers:Streamer[] }) {
  const router=useRouter();
  const [streamers,setStreamers]=useState(initialStreamers);
  const [username,setUsername]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);

  const add=async()=>{ if(!username.trim())return; setLoading(true);setError(null);
    try{ const res=await fetch("/api/admin/streamers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({twitchUsername:username.trim()})});
    if(!res.ok)throw new Error((await res.json()).error??"Erreur");
    setStreamers(p=>[...p,await res.json()]);setUsername("");router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Erreur");}finally{setLoading(false);} };

  const remove=async(id:string)=>{ await fetch(`/api/admin/streamers/${id}`,{method:"DELETE"}); setStreamers(p=>p.filter(s=>s.id!==id));router.refresh(); };

  return (
    <div className="card p-6 space-y-5">
      <div><label className="label">Pseudo Twitch</label>
        <div className="flex gap-2">
          <input type="text" value={username} onChange={e=>setUsername(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="pseudo_twitch" className="input"/>
          <button onClick={add} disabled={loading||!username.trim()} className="btn-primary whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed">{loading?"…":"Ajouter"}</button>
        </div>
        {error&&<p className="font-heading text-xs text-red-400 mt-2">{error}</p>}
      </div>
      <div className="space-y-2 pt-4 border-t border-brand-border">
        <p className="font-heading text-xs uppercase tracking-widest text-brand-muted mb-3">{streamers.length} streamer{streamers.length!==1?"s":""}</p>
        {streamers.length===0&&<p className="font-heading text-xs text-brand-muted">Aucun streamer</p>}
        {streamers.map(s=>(
          <div key={s.id} className="flex items-center justify-between bg-brand-surface border border-brand-border rounded-sm px-4 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-brand-card border border-brand-border flex items-center justify-center">
                <span className="font-heading font-bold text-[10px] text-brand-orange">{s.twitchUsername[0].toUpperCase()}</span>
              </div>
              <span className="font-heading font-bold text-sm uppercase text-brand-text">{s.twitchUsername}</span>
            </div>
            <button onClick={()=>remove(s.id)} className="btn-danger text-[11px] py-1 px-2.5">Retirer</button>
          </div>
        ))}
      </div>
    </div>
  );
}
