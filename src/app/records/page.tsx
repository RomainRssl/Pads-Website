"use client";
import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

interface TrackRecord { carClass:string; circuit:string; constructor:string; piloteName:string; bestLapTime:number; raceDate:string }
interface RecordsData { records: Record<string, TrackRecord[]> }

function formatLapTime(s:number){ const m=Math.floor(s/60); return `${m}:${(s%60).toFixed(3).padStart(6,"0")}`; }
function formatDate(d:string){ return new Date(d).toLocaleDateString("fr-FR"); }

export default function RecordsPage() {
  const [records,setRecords]=useState<RecordsData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [selectedClass,setSelectedClass]=useState<string|null>(null);

  useEffect(()=>{
    fetch("/api/records")
      .then(r=>{ if(!r.ok) throw new Error("Erreur"); return r.json(); })
      .then(d=>{ setRecords(d); const cls=Object.keys(d.records); if(cls.length>0) setSelectedClass(cls[0]); })
      .catch(e=>setError(e.message))
      .finally(()=>setLoading(false));
  },[]);

  const classes=records?Object.keys(records.records):[];
  const current=selectedClass&&records?records.records[selectedClass]??[]:[];

  return (
    <main className="min-h-screen bg-brand-navy pt-16">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="section-header"><div className="section-bar"/><h1 className="section-title">Records des Opens</h1></div>
        {loading&&<div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-14 bg-brand-card border border-brand-border rounded-sm animate-pulse"/>)}</div>}
        {error&&<div className="card border-l-2 border-l-red-500 px-5 py-4"><p className="font-heading text-sm text-red-400">{error}</p></div>}
        {!loading&&!error&&records&&(
          <>
            <div className="flex gap-2 mb-6 flex-wrap">
              {classes.map(cls=>(
                <button key={cls} onClick={()=>setSelectedClass(cls)} className={`font-heading font-bold text-xs uppercase tracking-widest px-4 py-2 rounded-sm border transition-all ${selectedClass===cls?"bg-brand-orange text-brand-navy border-brand-orange":"bg-brand-card border-brand-border text-brand-muted hover:border-brand-orange hover:text-brand-orange"}`}>{cls}</button>
              ))}
            </div>
            {current.length===0?(
              <div className="card p-8 text-center"><p className="font-heading text-sm uppercase tracking-widest text-brand-muted">Aucun record</p></div>
            ):(
              <div className="card overflow-hidden">
                <table className="table-racing">
                  <thead><tr><th>Circuit</th><th>Constructeur</th><th>Pilote</th><th className="text-brand-orange">Temps</th><th>Date</th></tr></thead>
                  <tbody>{current.map((r,i)=><tr key={i}><td className="font-heading font-bold text-sm">{r.circuit}</td><td className="text-brand-muted">{r.constructor||"—"}</td><td className="text-brand-muted">{r.piloteName}</td><td className="font-mono font-semibold text-brand-orange">{formatLapTime(r.bestLapTime)}</td><td className="text-brand-muted">{formatDate(r.raceDate)}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </main>
  );
}
