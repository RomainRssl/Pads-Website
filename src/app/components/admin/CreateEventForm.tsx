"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface F { title:string; date:string; game:string; track:string; car:string; description:string }
const INIT:F={ title:"",date:"",game:"",track:"",car:"",description:"" };

export default function CreateEventForm() {
  const router=useRouter();
  const [form,setForm]=useState<F>(INIT);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [success,setSuccess]=useState(false);
  const set=(k:keyof F)=>(e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>)=>setForm(p=>({...p,[k]:e.target.value}));

  const handleSubmit=async()=>{
    setLoading(true); setError(null);
    try{
      const res=await fetch("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...form,date:new Date(form.date).toISOString()})});
      if(!res.ok) throw new Error((await res.json()).error??"Erreur");
      setSuccess(true); setForm(INIT); setTimeout(()=>{setSuccess(false);router.push("/admin");},1500);
    }catch(e){ setError(e instanceof Error?e.message:"Erreur"); }finally{ setLoading(false); }
  };

  return (
    <div className="card p-6 space-y-5">
      {(["title","game","track","car"] as const).map(k=>(
        <div key={k}><label className="label">{{title:"Titre",game:"Jeu",track:"Circuit",car:"Voiture / Classe"}[k]}</label>
        <input type="text" value={form[k]} onChange={set(k)} className="input"/></div>
      ))}
      <div><label className="label">Date et heure</label><input type="datetime-local" value={form.date} onChange={set("date")} className="input"/></div>
      <div><label className="label">Description (optionnel)</label><textarea value={form.description} onChange={set("description")} rows={3} className="input resize-none"/></div>
      {error&&<div className="bg-red-950/30 border border-red-900/40 rounded-sm px-4 py-3"><p className="font-heading text-xs text-red-400">{error}</p></div>}
      {success&&<div className="bg-green-950/30 border border-green-900/40 rounded-sm px-4 py-3"><p className="font-heading font-bold text-xs uppercase tracking-widest text-green-400">✓ Course créée</p></div>}
      <div className="flex gap-3 pt-2">
        <button onClick={handleSubmit} disabled={loading||!form.title||!form.date||!form.game||!form.track||!form.car} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">
          {loading?"Création…":"Créer la course"}
        </button>
        <button onClick={()=>router.back()} className="btn-ghost">Annuler</button>
      </div>
    </div>
  );
}
