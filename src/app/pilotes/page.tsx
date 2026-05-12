import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Image from "next/image";

export const revalidate = 60;

export default async function PilotesPage() {
  const players = await prisma.player.findMany({ include:{ team:true }, orderBy:{ xp:"desc" } });
  return (
    <main className="min-h-screen bg-brand-navy">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="section-header">
          <div className="section-bar" /><h1 className="section-title">Pilotes</h1>
          <span className="font-heading text-xs text-brand-muted ml-auto">{players.length} pilotes</span>
        </div>
        {players.length === 0 ? (
          <div className="card p-12 text-center"><p className="font-heading font-semibold text-sm uppercase tracking-widest text-brand-muted">Aucun pilote</p></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {players.map((p,i) => (
              <div key={p.id} className="card border-l-2 border-l-brand-orange p-5 hover:border-brand-orange/50 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`font-heading font-bold text-sm w-7 text-right ${i===0?"text-brand-orange":i===1?"text-slate-300":i===2?"text-amber-600":"text-brand-muted"}`}>#{i+1}</span>
                  <div className="w-9 h-9 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.avatarUrl ? <Image src={p.avatarUrl} alt={p.username} width={36} height={36}/> : <span className="font-heading font-bold text-sm text-brand-orange">{p.username[0].toUpperCase()}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-heading font-bold text-sm uppercase truncate text-brand-text">{p.username}</p>
                    {p.team && <p className="font-body text-xs text-brand-muted truncate">{p.team.name}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-brand-border">
                  <div className="text-center"><p className="font-heading font-bold text-base text-brand-text leading-none">{p.xp}</p><p className="font-heading text-[9px] uppercase tracking-wider text-brand-muted mt-0.5">XP</p></div>
                  <div className="text-center"><p className="font-heading font-bold text-base text-brand-text leading-none">{p.finishedRaces}</p><p className="font-heading text-[9px] uppercase tracking-wider text-brand-muted mt-0.5">Courses</p></div>
                  <div className="text-center"><p className="font-heading font-bold text-base text-brand-orange leading-none">{p.finishedRaces>0?Math.round((p.cleanRaces/p.finishedRaces)*100):0}%</p><p className="font-heading text-[9px] uppercase tracking-wider text-brand-muted mt-0.5">Clean</p></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
