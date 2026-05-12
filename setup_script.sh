#!/bin/bash
# ============================================================
# PADS Website — Script de redesign racing
# À exécuter à la RACINE du projet : bash setup-redesign.sh
# ============================================================

set -e
echo "🏁 PADS Redesign — création des fichiers..."

# ─── tailwind.config.ts ────────────────────────────────────
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          orange:  "#F07000",
          orange2: "#F4A261",
          navy:    "#0B0D14",
          dark:    "#0A0A0F",
          surface: "#0D1020",
          card:    "#0F1120",
          border:  "#1A1D28",
          text:    "#E2E8F0",
          muted:   "#556080",
          discord: "#5865F2",
        },
      },
      fontFamily: {
        heading: ["var(--font-rajdhani)", "sans-serif"],
        body:    ["var(--font-inter)", "sans-serif"],
      },
      backgroundImage: {
        "racing-grid":
          "linear-gradient(rgba(240,112,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(240,112,0,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "40px 40px",
      },
      boxShadow: {
        "orange-glow":    "0 0 20px rgba(240,112,0,0.20)",
        "orange-glow-lg": "0 0 40px rgba(240,112,0,0.28)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "ticker":  "ticker 25s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        ticker: {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
EOF

# ─── src/app/globals.css ───────────────────────────────────
cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    background-color: theme("colors.brand.navy");
    color: theme("colors.brand.text");
    font-family: var(--font-inter), sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: theme("colors.brand.navy"); }
  ::-webkit-scrollbar-thumb { background: theme("colors.brand.border"); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: theme("colors.brand.orange"); }
}

@layer components {
  .btn-primary {
    @apply inline-flex items-center gap-2 bg-brand-orange text-brand-navy font-heading font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-sm hover:bg-brand-orange2 transition-colors cursor-pointer;
  }
  .btn-ghost {
    @apply inline-flex items-center gap-2 font-heading font-bold text-xs uppercase tracking-widest text-brand-muted border border-brand-border px-5 py-2.5 rounded-sm hover:border-brand-orange hover:text-brand-orange transition-all cursor-pointer;
  }
  .btn-danger {
    @apply inline-flex items-center gap-2 font-heading font-bold text-xs uppercase tracking-widest text-red-400 border border-red-900/40 px-4 py-2 rounded-sm hover:bg-red-900/20 transition-colors cursor-pointer;
  }
  .section-header { @apply flex items-center gap-3 mb-6; }
  .section-bar    { @apply w-0.5 h-5 bg-brand-orange flex-shrink-0; }
  .section-title  { @apply font-heading font-bold text-lg uppercase tracking-widest text-brand-text; }
  .card           { @apply bg-brand-card border border-brand-border rounded-sm; }
  .badge-game     { @apply inline-block font-heading font-bold text-[10px] uppercase tracking-[0.18em] bg-brand-orange/10 text-brand-orange border border-brand-orange/30 px-2 py-0.5 rounded-sm; }
  .badge-muted    { @apply inline-block font-heading font-semibold text-[11px] uppercase tracking-wide bg-brand-surface border border-brand-border text-brand-muted px-2.5 py-1 rounded-sm; }
  .input          { @apply w-full bg-brand-surface border border-brand-border text-brand-text font-body text-sm px-4 py-2.5 rounded-sm focus:outline-none focus:border-brand-orange transition-colors placeholder:text-brand-muted/50; }
  .label          { @apply block font-heading font-semibold text-xs uppercase tracking-widest text-brand-muted mb-2; }
  .table-racing   { @apply w-full border-collapse; }
  .table-racing th { @apply font-heading font-bold text-xs uppercase tracking-widest text-brand-muted text-left px-4 py-3 border-b border-brand-border; }
  .table-racing td { @apply font-body text-sm text-brand-text px-4 py-3 border-b border-brand-border/50; }
  .table-racing tr:hover td { @apply bg-brand-surface/50; }
  .stat-card  { @apply bg-brand-card border border-brand-border rounded-sm p-4 flex flex-col; }
  .stat-value { @apply font-heading font-bold text-3xl text-brand-text leading-none; }
  .stat-label { @apply font-heading text-xs uppercase tracking-widest text-brand-muted mt-1.5; }
}
EOF

# ─── src/app/layout.tsx ────────────────────────────────────
cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import { Rajdhani, Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-rajdhani",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Par amour du spin — Sim Racing Community",
  description: "La communauté française dédiée à la simulation de course.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${rajdhani.variable} ${inter.variable}`}>
      <body className="bg-brand-navy text-brand-text antialiased font-body">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
EOF

# ─── src/app/page.tsx ──────────────────────────────────────
cat > src/app/page.tsx << 'EOF'
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/layout/Hero";
import EventCard from "@/components/events/EventCard";

export const revalidate = 60;

export default async function HomePage() {
  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });

  return (
    <main className="min-h-screen bg-brand-navy">
      <Navbar />
      <Hero />
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-0.5 h-5 bg-brand-orange" />
          <h2 className="font-heading font-bold text-lg uppercase tracking-widest text-brand-text">
            Prochaines courses
          </h2>
          <span className="font-heading text-xs text-brand-muted ml-auto">{events.length} à venir</span>
        </div>
        {events.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="font-heading font-semibold text-sm uppercase tracking-widest text-brand-muted">
              Aucune course planifiée
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        )}
      </section>
      <footer className="border-t border-brand-border mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <p className="font-heading font-semibold text-xs uppercase tracking-widest text-brand-muted">
            Par amour du spin © {new Date().getFullYear()}
          </p>
          <p className="font-heading text-xs text-brand-muted">Communauté Sim Racing</p>
        </div>
      </footer>
    </main>
  );
}
EOF

# ─── Dossiers ──────────────────────────────────────────────
mkdir -p src/app/components/layout
mkdir -p src/app/components/events
mkdir -p src/app/components/lives
mkdir -p src/app/components/admin
mkdir -p src/app/pilotes
mkdir -p src/app/classement
mkdir -p src/app/records
mkdir -p src/app/race-history
mkdir -p src/app/lives
mkdir -p src/app/admin/create
mkdir -p src/app/admin/results
mkdir -p src/app/admin/streamers

# ─── Navbar ────────────────────────────────────────────────
cat > src/app/components/layout/Navbar.tsx << 'EOF'
"use client";
import Link from "next/link";
import Image from "next/image";
import { useSession, signIn, signOut } from "next-auth/react";

const links = [
  { href: "/",           label: "Accueil" },
  { href: "/pilotes",    label: "Pilotes" },
  { href: "/lives",      label: "Lives" },
  { href: "/classement", label: "Classement" },
  { href: "/records",    label: "Records" },
];

export default function Navbar() {
  const { data: session } = useSession();
  return (
    <>
      <div className="bg-brand-orange overflow-hidden whitespace-nowrap py-1.5">
        <div className="inline-block animate-ticker">
          {["Le Mans Ultimate","Communauté sim racing française","Spa-Francorchamps","LMGT3 · Hypercar","Rejoindre le Discord",
            "Le Mans Ultimate","Communauté sim racing française","Spa-Francorchamps","LMGT3 · Hypercar","Rejoindre le Discord"].map((t,i) => (
            <span key={i} className="inline-block">
              <span className="font-heading font-bold text-xs tracking-widest uppercase text-brand-navy px-5">{t}</span>
              <span className="text-brand-navy/30 text-xs">◆</span>
            </span>
          ))}
        </div>
      </div>
      <nav className="bg-brand-surface border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/LOGO.png" alt="PADS" width={36} height={36} className="rounded-full" />
            <span className="font-heading font-bold text-base uppercase tracking-wide">
              Par amour du <span className="text-brand-orange">spin</span>
            </span>
          </Link>
          <ul className="hidden md:flex items-center gap-6">
            {links.map(l => (
              <li key={l.href}>
                <Link href={l.href} className="font-heading font-semibold text-sm uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors">
                  {l.label}
                </Link>
              </li>
            ))}
            {session?.user?.role === "ADMIN" && (
              <li>
                <Link href="/admin" className="font-heading font-semibold text-sm uppercase tracking-widest text-brand-orange hover:text-brand-orange2 transition-colors">
                  Admin
                </Link>
              </li>
            )}
          </ul>
          <div>
            {session ? (
              <div className="flex items-center gap-3">
                <Image src={session.user?.image ?? "/LOGO.png"} alt={session.user?.name ?? ""} width={28} height={28} className="rounded-full" />
                <button onClick={() => signOut()} className="font-heading font-bold text-xs uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors">
                  Déconnexion
                </button>
              </div>
            ) : (
              <button onClick={() => signIn("discord")} className="font-heading font-bold text-xs uppercase tracking-widest border border-brand-orange text-brand-orange px-4 py-2 rounded-sm hover:bg-brand-orange hover:text-brand-navy transition-all">
                Se connecter
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
EOF

# ─── Hero ──────────────────────────────────────────────────
cat > src/app/components/layout/Hero.tsx << 'EOF'
import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative bg-brand-navy overflow-hidden border-b border-brand-border">
      <div className="absolute inset-0 bg-racing-grid bg-grid opacity-60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-10 pointer-events-none hidden md:block">
        <Image src="/LOGO.png" alt="" width={200} height={200} className="rounded-full blur-sm" />
      </div>
      <div className="absolute bottom-0 left-0 w-2/3 h-px bg-gradient-to-r from-brand-orange to-transparent" />
      <div className="relative max-w-7xl mx-auto px-6 py-16">
        <p className="font-heading font-bold text-xs uppercase tracking-[0.25em] text-brand-orange mb-3">Sim Racing · France · LMU</p>
        <h1 className="font-heading font-bold text-6xl md:text-7xl uppercase leading-none text-brand-text mb-4">
          Par amour<br />du <span className="text-brand-orange">spin&nbsp;!</span>
        </h1>
        <p className="font-body text-sm text-brand-muted max-w-md leading-relaxed mb-8">
          La communauté française dédiée à la simulation de course. Courses organisées, championnats, et fun sur circuit.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="https://discord.gg/AmMRGSbaV" target="_blank" className="flex items-center gap-2 bg-brand-orange text-brand-navy font-heading font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-sm hover:bg-brand-orange2 transition-colors">
            <svg width="16" height="12" viewBox="0 0 71 55" fill="currentColor"><path d="M60.1 4.9C55.6 2.8 50.7 1.3 45.7.4c-.1 0-.2 0-.2.1-.7 1.1-1.4 2.6-1.9 3.7-5.5-.8-10.9-.8-16.3 0-.5-1.2-1.2-2.6-1.9-3.7 0-.1-.1-.1-.2-.1C20.3 1.3 15.4 2.8 10.9 4.9c0 0-.1 0-.1.1C1.6 18.7-.9 32.1.3 45.4v.1c.1.1.1.1.2.2 7 5.2 13.8 8.4 20.5 10.5.1 0 .2 0 .2-.1 1.6-2.1 3-4.4 4.2-6.7.1-.1 0-.2-.1-.3-2.2-.8-4.3-1.9-6.3-3.1-.1-.1-.1-.2 0-.3l1.2-.9s.1-.1.2 0c13.2 6 27.5 6 40.5 0 .1 0 .1 0 .2.1l1.2.9c.1.1.1.2 0 .3-2 1.3-4.1 2.3-6.3 3.1-.1 0-.2.2-.1.3 1.2 2.3 2.6 4.5 4.2 6.7.1.1.2.1.2.1 6.7-2.1 13.5-5.3 20.5-10.5.1 0 .1-.1.1-.2 1.5-15-2.5-28.3-10.8-40-.1-.1-.1-.1-.2-.1zM23.7 37.3c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.9 7.2-6.4 7.2zm23.6 0c-3.5 0-6.4-3.2-6.4-7.2s2.8-7.2 6.4-7.2 6.5 3.2 6.4 7.2c0 4-2.9 7.2-6.4 7.2z"/></svg>
            Discord
          </Link>
          <Link href="https://discord.gg/AmMRGSbaV" target="_blank" className="font-heading font-bold text-xs uppercase tracking-widest text-brand-muted border border-brand-border px-5 py-2.5 rounded-sm hover:border-brand-orange hover:text-brand-orange transition-all">
            Rejoindre le serveur
          </Link>
        </div>
        <div className="flex gap-8 mt-10 pt-8 border-t border-brand-border">
          {[{ val:"LMU", label:"Plateforme" },{ val:"24", label:"Pilotes" },{ val:"1", label:"Course à venir" }].map((s,i) => (
            <div key={i} className="flex flex-col">
              <span className="font-heading font-bold text-3xl text-brand-text leading-none">
                {s.val === "LMU" ? <span className="text-brand-orange">{s.val}</span> : s.val}
              </span>
              <span className="font-heading text-xs uppercase tracking-widest text-brand-muted mt-1">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
EOF

# ─── Footer ────────────────────────────────────────────────
cat > src/app/components/layout/Footer.tsx << 'EOF'
import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-brand-border mt-12">
      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Image src="/LOGO.png" alt="PADS" width={28} height={28} className="rounded-full opacity-80" />
          <span className="font-heading font-bold text-xs uppercase tracking-widest text-brand-muted">
            Par amour du <span className="text-brand-orange">spin</span>
          </span>
        </div>
        <nav className="flex items-center gap-6">
          {[{href:"/pilotes",label:"Pilotes"},{href:"/classement",label:"Classement"},{href:"/records",label:"Records"},{href:"/race-history",label:"Historique"}].map(l => (
            <Link key={l.href} href={l.href} className="font-heading font-semibold text-xs uppercase tracking-widest text-brand-muted hover:text-brand-orange transition-colors">{l.label}</Link>
          ))}
        </nav>
        <p className="font-heading text-xs text-brand-muted/50">© {new Date().getFullYear()} Communauté Sim Racing</p>
      </div>
    </footer>
  );
}
EOF

# ─── EventCard ─────────────────────────────────────────────
cat > src/app/components/events/EventCard.tsx << 'EOF'
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
EOF

# ─── Page Pilotes ──────────────────────────────────────────
cat > src/app/pilotes/page.tsx << 'EOF'
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
EOF

# ─── Page Classement ───────────────────────────────────────
cat > src/app/classement/page.tsx << 'EOF'
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Image from "next/image";

export const revalidate = 60;

export default async function ClassementPage() {
  const players = await prisma.player.findMany({ include:{ team:true }, orderBy:{ xp:"desc" } });
  const teams   = await prisma.team.findMany({ orderBy:{ xp:"desc" } });
  return (
    <main className="min-h-screen bg-brand-navy">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <section>
          <div className="section-header"><div className="section-bar"/><h1 className="section-title">Classement pilotes</h1></div>
          <div className="card overflow-hidden">
            <table className="table-racing">
              <thead><tr><th>#</th><th>Pilote</th><th>Équipe</th><th className="text-right">XP</th><th className="text-right">Argent</th><th className="text-right">Courses</th><th className="text-right">% Clean</th></tr></thead>
              <tbody>
                {players.map((p,i) => (
                  <tr key={p.id}>
                    <td className={`font-heading font-bold w-12 ${i<3?"text-brand-orange":"text-brand-muted"}`}>{i+1}</td>
                    <td><div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-surface border border-brand-border flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.avatarUrl?<Image src={p.avatarUrl} alt={p.username} width={28} height={28}/>:<span className="font-heading font-bold text-xs text-brand-orange">{p.username[0].toUpperCase()}</span>}
                      </div>
                      <span className="font-heading font-bold text-sm uppercase">{p.username}</span>
                    </div></td>
                    <td className="text-brand-muted text-xs">{p.team?.name??"—"}</td>
                    <td className="text-right font-heading font-bold text-brand-orange">{p.xp}</td>
                    <td className="text-right font-heading text-sm">{p.money.toLocaleString("fr-FR")} €</td>
                    <td className="text-right font-heading text-sm text-brand-muted">{p.finishedRaces}</td>
                    <td className="text-right font-heading font-bold text-sm">{p.finishedRaces>0?`${Math.round((p.cleanRaces/p.finishedRaces)*100)}%`:"—"}</td>
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
EOF

# ─── Page Records ──────────────────────────────────────────
cat > src/app/records/page.tsx << 'EOF'
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
EOF

# ─── Page Race History ─────────────────────────────────────
cat > src/app/race-history/page.tsx << 'EOF'
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const revalidate = 60;

export default async function RaceHistoryPage() {
  const sessions = await prisma.raceSession.findMany({
    include:{ results:{ include:{ player:true }, orderBy:{ position:"asc" } }, event:true },
    orderBy:{ createdAt:"desc" },
  });
  return (
    <main className="min-h-screen bg-brand-navy">
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="section-header"><div className="section-bar"/><h1 className="section-title">Historique des courses</h1><span className="font-heading text-xs text-brand-muted ml-auto">{sessions.length} sessions</span></div>
        {sessions.length===0?(
          <div className="card p-12 text-center"><p className="font-heading font-semibold text-sm uppercase tracking-widest text-brand-muted">Aucune session</p></div>
        ):(
          <div className="space-y-6">
            {sessions.map(s=>{
              const date=new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"long",year:"numeric"}).format(new Date(s.createdAt));
              return(
                <div key={s.id} className="card border-l-2 border-l-brand-orange overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border bg-brand-surface/50">
                    <div>{s.event&&<p className="badge-game mb-1">{s.event.game}</p>}<h3 className="font-heading font-bold text-base uppercase text-brand-text">{s.event?.title??`Session #${s.id.slice(0,6)}`}</h3>{s.event?.track&&<p className="font-body text-xs text-brand-muted mt-0.5">{s.event.track}</p>}</div>
                    <p className="font-heading text-xs text-brand-muted">{date}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table-racing">
                      <thead><tr><th className="w-12">Pos.</th><th>Pilote</th><th className="text-right">XP</th><th className="text-right">Argent</th><th className="text-right">Clean</th></tr></thead>
                      <tbody>
                        {s.results.map(r=>(
                          <tr key={r.id}>
                            <td className={`font-heading font-bold ${r.position<=3?"text-brand-orange":"text-brand-muted"}`}>{r.position<=3?["🥇","🥈","🥉"][r.position-1]:`#${r.position}`}</td>
                            <td className="font-heading font-bold text-sm uppercase">{r.player.username}</td>
                            <td className="text-right font-heading font-bold text-brand-orange">+{r.xpGained}</td>
                            <td className="text-right font-heading text-sm">+{r.moneyGained.toLocaleString("fr-FR")} €</td>
                            <td className="text-right">{r.isClean?<span className="font-heading text-xs text-green-400">✓</span>:<span className="text-brand-muted">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
EOF

# ─── Page Lives ────────────────────────────────────────────
cat > src/app/lives/page.tsx << 'EOF'
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LiveMultiplex from "@/components/lives/LiveMultiplex";

export const revalidate = 0;

export default async function LivesPage() {
  const streamers = await prisma.twitchStreamer.findMany({ orderBy:{ createdAt:"asc" } });
  return (
    <main className="min-h-screen bg-brand-navy flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="section-header mb-6">
          <div className="section-bar"/><h1 className="section-title">Lives</h1>
          <span className="font-heading text-xs text-brand-muted ml-auto">Jusqu&apos;à 10 streams simultanés</span>
        </div>
        <LiveMultiplex streamers={streamers} />
      </div>
      <Footer />
    </main>
  );
}
EOF

# ─── LiveMultiplex ─────────────────────────────────────────
cat > src/app/components/lives/LiveMultiplex.tsx << 'EOF'
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
EOF

# ─── Admin layout ──────────────────────────────────────────
cat > src/app/admin/layout.tsx << 'EOF'
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
EOF

# ─── Admin dashboard ───────────────────────────────────────
cat > src/app/admin/page.tsx << 'EOF'
import { prisma } from "@/lib/prisma";
import EventTable from "@/components/admin/EventTable";

export default async function AdminPage() {
  const events  = await prisma.event.findMany({ orderBy:{ date:"asc" } });
  const players = await prisma.player.count();
  const sessions= await prisma.raceSession.count();
  return (
    <div className="space-y-8">
      <div>
        <div className="section-header"><div className="section-bar"/><h1 className="section-title">Dashboard</h1></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[{label:"Événements",value:events.length},{label:"Pilotes",value:players},{label:"Sessions",value:sessions},{label:"À venir",value:events.filter(e=>new Date(e.date)>new Date()).length}].map(s=>(
            <div key={s.label} className="stat-card"><span className="stat-value text-brand-orange">{s.value}</span><span className="stat-label">{s.label}</span></div>
          ))}
        </div>
      </div>
      <div><div className="section-header"><div className="section-bar"/><h2 className="section-title">Tous les événements</h2></div><EventTable events={events}/></div>
    </div>
  );
}
EOF

# ─── Admin EventTable ──────────────────────────────────────
cat > src/app/components/admin/EventTable.tsx << 'EOF'
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Event { id:string; title:string; date:Date|string; game:string; track:string; car:string }

export default function EventTable({ events }:{ events:Event[] }) {
  const router = useRouter();
  const [deleting,setDeleting] = useState<string|null>(null);
  const handleDelete=async(id:string)=>{ if(!confirm("Supprimer ?")) return; setDeleting(id); await fetch(`/api/events/${id}`,{method:"DELETE"}); setDeleting(null); router.refresh(); };
  if(events.length===0) return <div className="card p-12 text-center"><p className="font-heading font-semibold text-sm uppercase tracking-widest text-brand-muted">Aucun événement</p></div>;
  return (
    <div className="card overflow-hidden">
      <table className="table-racing">
        <thead><tr><th>Titre</th><th>Jeu</th><th>Circuit</th><th>Voiture</th><th>Date</th><th>Statut</th><th className="text-right">Action</th></tr></thead>
        <tbody>
          {events.map(e=>{
            const isPast=new Date(e.date)<new Date();
            return(
              <tr key={e.id}>
                <td className="font-heading font-bold text-sm uppercase">{e.title}</td>
                <td><span className="badge-game">{e.game}</span></td>
                <td className="text-brand-muted text-xs">{e.track}</td>
                <td className="text-brand-muted text-xs">{e.car}</td>
                <td className="font-body text-xs text-brand-muted">{new Intl.DateTimeFormat("fr-FR",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(e.date))}</td>
                <td><span className={`font-heading font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${isPast?"text-brand-muted border-brand-border bg-brand-surface":"text-green-400 border-green-900/40 bg-green-950/30"}`}>{isPast?"Passé":"À venir"}</span></td>
                <td className="text-right"><button onClick={()=>handleDelete(e.id)} disabled={deleting===e.id} className="btn-danger text-[11px] py-1 px-3">{deleting===e.id?"…":"Supprimer"}</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
EOF

# ─── Admin create page ─────────────────────────────────────
cat > src/app/admin/create/page.tsx << 'EOF'
import CreateEventForm from "@/components/admin/CreateEventForm";
export default function AdminCreatePage() {
  return <div className="max-w-2xl"><div className="section-header"><div className="section-bar"/><h1 className="section-title">Créer une course</h1></div><CreateEventForm/></div>;
}
EOF

# ─── CreateEventForm ───────────────────────────────────────
cat > src/app/components/admin/CreateEventForm.tsx << 'EOF'
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
EOF

# ─── Admin results ─────────────────────────────────────────
cat > src/app/admin/results/page.tsx << 'EOF'
import ResultsUploadForm from "@/components/admin/ResultsUploadForm";
export default function AdminResultsPage() {
  return <div className="max-w-3xl"><div className="section-header"><div className="section-bar"/><h1 className="section-title">Traitement des résultats</h1></div><ResultsUploadForm/></div>;
}
EOF

# ─── ResultsUploadForm ─────────────────────────────────────
cat > src/app/components/admin/ResultsUploadForm.tsx << 'EOF'
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
EOF

# ─── Admin streamers page ──────────────────────────────────
cat > src/app/admin/streamers/page.tsx << 'EOF'
import { prisma } from "@/lib/prisma";
import StreamerManager from "@/components/admin/StreamerManager";
export default async function AdminStreamersPage() {
  const streamers=await prisma.twitchStreamer.findMany({orderBy:{createdAt:"asc"}});
  return <div className="max-w-xl"><div className="section-header"><div className="section-bar"/><h1 className="section-title">Gestion des streamers</h1></div><StreamerManager initialStreamers={streamers}/></div>;
}
EOF

# ─── StreamerManager ───────────────────────────────────────
cat > src/app/components/admin/StreamerManager.tsx << 'EOF'
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
EOF

echo ""
echo "✅ Terminé ! Fichiers créés :"
echo "   tailwind.config.ts"
echo "   src/app/globals.css"
echo "   src/app/layout.tsx"
echo "   src/app/page.tsx"
echo "   src/app/pilotes/page.tsx"
echo "   src/app/classement/page.tsx"
echo "   src/app/records/page.tsx"
echo "   src/app/race-history/page.tsx"
echo "   src/app/lives/page.tsx"
echo "   src/app/admin/layout.tsx + page.tsx + create/ + results/ + streamers/"
echo "   src/app/components/layout/Navbar.tsx + Hero.tsx + Footer.tsx"
echo "   src/app/components/events/EventCard.tsx"
echo "   src/app/components/lives/LiveMultiplex.tsx"
echo "   src/app/components/admin/EventTable.tsx + CreateEventForm.tsx + ResultsUploadForm.tsx + StreamerManager.tsx"
echo ""
echo "🚀 Prochaine étape :"
echo "   git checkout -b feature/redesign-racing"
echo "   git add ."
echo "   git commit -m 'feat: redesign complet racing orange PADS'"
echo "   git push origin feature/redesign-racing"
