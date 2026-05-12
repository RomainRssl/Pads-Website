import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";

export default async function AdminLayout({ children }:{ children:React.ReactNode }) {
  const session = await auth();
  if(!session||session.user?.role!=="ADMIN") redirect("/");
  return (
    <div className="min-h-screen bg-brand-navy">
      <Navbar />
      <div className="bg-brand-surface border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-6 h-11 flex items-center gap-6">
          <span className="font-heading font-bold text-[10px] uppercase tracking-[0.2em] text-brand-orange border border-brand-orange/30 bg-brand-orange/10 px-2 py-0.5 rounded-sm">Admin</span>
          {[{href:"/admin",label:"Dashboard",icon:"⊞"},{href:"/admin/create",label:"Créer",icon:"＋"},{href:"/admin/results",label:"Résultats",icon:"◎"},{href:"/admin/streamers",label:"Streamers",icon:"▷"}].map(l=>(
            <Link key={l.href} href={l.href} className="font-heading font-semibold text-xs uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors flex items-center gap-1.5">
              <span className="text-brand-orange">{l.icon}</span>{l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-10">{children}</div>
    </div>
  );
}
