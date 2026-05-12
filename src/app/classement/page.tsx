import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const revalidate = 60;

export default async function ClassementPage() {
  const players = await prisma.player.findMany({ include:{ team:true }, orderBy:{ xp:"desc" } });
  const teams   = await prisma.team.findMany({ orderBy:{ xp:"desc" } });
  return (
    <main className="min-h-screen bg-brand-navy pt-16">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <section>
          <div className="section-header"><div className="section-bar"/><h1 className="section-title">Classement pilotes</h1></div>
          <div className="card overflow-hidden">
            <table className="table-racing">
              <thead><tr><th>#</th><th>Pilote</th><th>Équipe</th><th className="text-right">XP</th><th className="text-right">Argent</th><th className="text-right">Courses</th></tr></thead>
              <tbody>
                {players.map((p,i) => (
                  <tr key={p.id}>
                    <td className={`font-heading font-bold w-12 ${i<3?"text-brand-orange":"text-brand-muted"}`}>{i+1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center flex-shrink-0">
                          <span className="font-heading font-bold text-xs text-brand-orange">{p.username[0].toUpperCase()}</span>
                        </div>
                        <span className="font-heading font-bold text-sm uppercase">{p.username}</span>
                      </div>
                    </td>
                    <td className="text-brand-muted text-xs">{p.team?.name??"—"}</td>
                    <td className="text-right font-heading font-bold text-brand-orange">{p.xp}</td>
                    <td className="text-right font-heading text-sm">{p.money.toLocaleString("fr-FR")} €</td>
                    <td className="text-right font-heading text-sm text-brand-muted">{p.totalRaces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {teams.length>0&&(
          <section>
            <div className="section-header"><div className="section-bar"/><h2 className="section-title">Équipes</h2></div>
            <div className="card overflow-hidden">
              <table className="table-racing">
                <thead><tr><th>#</th><th>Équipe</th><th className="text-right">XP total</th></tr></thead>
                <tbody>{teams.map((t,i)=><tr key={t.id}><td className={`font-heading font-bold w-12 ${i<3?"text-brand-orange":"text-brand-muted"}`}>{i+1}</td><td className="font-heading font-bold text-sm uppercase">{t.name}</td><td className="text-right font-heading font-bold text-brand-orange">{t.xp}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      <Footer />
    </main>
  );
}
