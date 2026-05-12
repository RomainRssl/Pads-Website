import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Image from "next/image";

export const revalidate = 60;

export default async function RecordsPage() {
  const players = await prisma.player.findMany({ orderBy:{ xp:"desc" } });
  const mostXp    = players[0]??null;
  const mostRaces = [...players].sort((a,b)=>b.finishedRaces-a.finishedRaces)[0]??null;
  const mostClean = [...players].filter(p=>p.finishedRaces>0).sort((a,b)=>(b.cleanRaces/b.finishedRaces)-(a.cleanRaces/a.finishedRaces))[0]??null;
  const richest   = [...players].sort((a,b)=>b.money-a.money)[0]??null;
  const records = [
    { label:"Plus d'XP", icon:"⚡", player:mostXp,    value:mostXp?`${mostXp.xp} XP`:"—" },
    { label:"Plus de courses", icon:"🏁", player:mostRaces, value:mostRaces?`${mostRaces.finishedRaces}`:"—" },
    { label:"Pilote le plus clean", icon:"✅", player:mostClean, value:mostClean&&mostClean.finishedRaces>0?`${Math.round((mostClean.cleanRaces/mostClean.finishedRaces)*100)}%`:"—" },
    { label:"Plus riche", icon:"💰", player:richest, value:richest?`${richest.money.toLocaleString("fr-FR")} €`:"—" },
  ];
  const top3 = players.slice(0,3);
  return (
    <main className="min-h-screen bg-brand-navy">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <section>
          <div className="section-header"><div className="section-bar"/><h1 className="section-title">Records</h1></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {records.map(r=>(
              <div key={r.label} className="card border-l-2 border-l-brand-orange p-5">
                <p className="font-heading text-xs uppercase tracking-widest text-brand-muted mb-3">{r.icon} {r.label}</p>
                {r.player?(
                  <><div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {(r.player as any).avatarUrl?<Image src={(r.player as any).avatarUrl} alt={r.player.username} width={28} height={28}/>:<span className="font-heading font-bold text-xs text-brand-orange">{r.player.username[0].toUpperCase()}</span>}
                    </div>
                    <span className="font-heading font-bold text-sm uppercase text-brand-text truncate">{r.player.username}</span>
                  </div>
                  <p className="font-heading font-bold text-2xl text-brand-orange">{r.value}</p></>
                ):<p className="font-heading text-sm text-brand-muted">Aucune donnée</p>}
              </div>
            ))}
          </div>
        </section>
        {top3.length>0&&(
          <section>
            <div className="section-header"><div className="section-bar"/><h2 className="section-title">Hall of Fame</h2></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {top3.map((p,i)=>(
                <div key={p.id} className={`card p-6 text-center border-t-2 ${i===0?"border-t-brand-orange":i===1?"border-t-slate-400":"border-t-amber-700"}`}>
                  <p className="text-4xl mb-3">{["🥇","🥈","🥉"][i]}</p>
                  <div className="w-14 h-14 rounded-full bg-brand-surface border-2 border-brand-border flex items-center justify-center overflow-hidden mx-auto mb-3">
                    {(p as any).avatarUrl?<Image src={(p as any).avatarUrl} alt={p.username} width={56} height={56}/>:<span className="font-heading font-bold text-xl text-brand-orange">{p.username[0].toUpperCase()}</span>}
                  </div>
                  <p className="font-heading font-bold text-base uppercase text-brand-text mb-1">{p.username}</p>
                  <p className="font-heading font-bold text-2xl text-brand-orange">{p.xp} <span className="text-xs text-brand-muted">XP</span></p>
                  <div className="mt-3 pt-3 border-t border-brand-border grid grid-cols-2 gap-2">
                    <div><p className="font-heading font-bold text-sm text-brand-text">{p.finishedRaces}</p><p className="font-heading text-[9px] uppercase tracking-wider text-brand-muted">Courses</p></div>
                    <div><p className="font-heading font-bold text-sm text-brand-text">{p.finishedRaces>0?`${Math.round((p.cleanRaces/p.finishedRaces)*100)}%`:"—"}</p><p className="font-heading text-[9px] uppercase tracking-wider text-brand-muted">Clean</p></div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      <Footer />
    </main>
  );
}
