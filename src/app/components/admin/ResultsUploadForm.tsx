"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface PreviewEntry { position:number; username:string; isClean:boolean; xpGained:number; moneyGained:number; found:boolean }
type Step="upload"|"preview"|"done";

export default function ResultsUploadForm() {
  const router=useRouter();
  const fileRef=useRef<HTMLInputElement>(null);
  const [step,setStep]=useState<Step>("upload");
  const [file,setFile]=useState<File|null>(null);
  const [preview,setPreview]=useState<PreviewEntry[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [eventId,setEventId]=useState("");

  const doPreview=async()=>{ if(!file)return; setLoading(true);setError(null);
    try{ const fd=new FormData();fd.append("file",file);if(eventId)fd.append("eventId",eventId);
    const res=await fetch("/api/admin/results/preview",{method:"POST",body:fd});
    if(!res.ok)throw new Error((await res.json()).error??"Erreur");
    setPreview(await res.json());setStep("preview"); }catch(e){setError(e instanceof Error?e.message:"Erreur");}finally{setLoading(false);} };

  const doValidate=async()=>{ if(!file)return; setLoading(true);setError(null);
    try{ const fd=new FormData();fd.append("file",file);if(eventId)fd.append("eventId",eventId);
    const res=await fetch("/api/admin/results/process",{method:"POST",body:fd});
    if(!res.ok)throw new Error((await res.json()).error??"Erreur");
    setStep("done");setTimeout(()=>router.push("/admin"),2000); }catch(e){setError(e instanceof Error?e.message:"Erreur");}finally{setLoading(false);} };

  const reset=()=>{setStep("upload");setFile(null);setPreview([]);setError(null);if(fileRef.current)fileRef.current.value="";};

  if(step==="done") return <div className="card p-10 text-center"><p className="text-4xl mb-4">🏆</p><p className="font-heading font-bold text-base uppercase tracking-widest text-green-400 mb-1">Résultats validés</p><p className="font-body text-sm text-brand-muted">Notification Discord envoyée…</p></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        {(["upload","preview"] as Step[]).map((s,i)=>(
          <div key={s} className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-heading font-bold text-xs ${step===s?"bg-brand-orange text-brand-navy":"bg-brand-surface border border-brand-border text-brand-muted"}`}>{i+1}</div>
            <span className={`font-heading font-bold text-xs uppercase tracking-widest ${step===s?"text-brand-text":"text-brand-muted"}`}>{s==="upload"?"Fichier":"Prévisualisation"}</span>
            {i<1&&<span className="text-brand-border mx-1">→</span>}
          </div>
        ))}
      </div>
      {step==="upload"&&(
        <div className="card p-6 space-y-4">
          <div><label className="label">ID événement (optionnel)</label><input type="text" value={eventId} onChange={e=>setEventId(e.target.value)} placeholder="event_id" className="input"/></div>
          <div><label className="label">Fichier résultats (JSON ou CSV)</label>
          <input ref={fileRef} type="file" accept=".json,.csv" onChange={e=>setFile(e.target.files?.[0]??null)} className="block w-full font-body text-sm text-brand-muted file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border file:border-brand-border file:text-xs file:font-heading file:font-bold file:uppercase file:tracking-widest file:text-brand-orange file:bg-brand-orange/10 file:cursor-pointer hover:file:bg-brand-orange/20"/></div>
          {error&&<p className="font-heading text-xs text-red-400">{error}</p>}
          <button onClick={doPreview} disabled={!file||loading} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">{loading?"Analyse…":"Prévisualiser"}</button>
        </div>
      )}
      {step==="preview"&&(
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-brand-border bg-brand-surface/50 flex items-center justify-between">
              <p className="font-heading font-bold text-xs uppercase tracking-widest text-brand-text">{preview.length} pilotes</p>
              <p className="font-heading text-xs text-brand-muted">{preview.filter(p=>!p.found).length} inconnu(s)</p>
            </div>
            <table className="table-racing">
              <thead><tr><th>Pos.</th><th>Pilote</th><th className="text-right">XP</th><th className="text-right">Argent</th><th>Clean</th><th>Statut</th></tr></thead>
              <tbody>
                {preview.map(p=>(
                  <tr key={p.position} className={!p.found?"opacity-40":""}>
                    <td className={`font-heading font-bold ${p.position<=3?"text-brand-orange":"text-brand-muted"}`}>#{p.position}</td>
                    <td className="font-heading font-bold text-sm uppercase">{p.username}</td>
                    <td className="text-right font-heading font-bold text-brand-orange">+{p.xpGained}</td>
                    <td className="text-right font-heading text-sm">+{p.moneyGained.toLocaleString("fr-FR")} €</td>
                    <td>{p.isClean?<span className="text-green-400 text-xs">✓</span>:<span className="text-brand-muted">—</span>}</td>
                    <td>{p.found?<span className="font-heading text-[10px] text-green-400 uppercase tracking-wider">OK</span>:<span className="font-heading text-[10px] text-red-400 uppercase tracking-wider">Inconnu</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {error&&<p className="font-heading text-xs text-red-400">{error}</p>}
          <div className="flex gap-3">
            <button onClick={doValidate} disabled={loading} className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed">{loading?"Traitement…":"Valider et envoyer"}</button>
            <button onClick={reset} className="btn-ghost">Recommencer</button>
          </div>
        </div>
      )}
    </div>
  );
}
