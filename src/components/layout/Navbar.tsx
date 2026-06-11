"use client";

import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tickerItems, setTickerItems] = useState(["Le Mans Ultimate","Communauté sim racing française","Spa-Francorchamps","LMGT3 · Hypercar","Rejoindre le Discord"]);
  const [boutiqueUrl, setBoutiqueUrl] = useState("https://www.etsy.com/fr/shop/ParAmourDuSpin");

  useEffect(() => {
    fetch("/api/ticker").then(r => r.json()).then(data => {
      if (data && data.length > 0) setTickerItems(data.map((d: {text: string}) => d.text));
    }).catch(() => {});
    fetch("/api/site-config?key=boutique_url").then(r => r.json()).then(d => {
      if (d.value) setBoutiqueUrl(d.value);
    }).catch(() => {});
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Ticker */}
      <div className="bg-brand-orange overflow-hidden whitespace-nowrap py-1" style={{height:"28px"}}>
        <div style={{display:"inline-block",animation:"ticker 25s linear infinite"}}>
          {[...tickerItems,...tickerItems].map((t,i)=>(
            <span key={i} className="inline-block">
              <span style={{fontFamily:"var(--font-rajdhani)",fontWeight:700,fontSize:"11px",letterSpacing:"0.15em",textTransform:"uppercase",color:"#0B0D14",padding:"0 20px"}}>{t}</span>
              <span style={{color:"rgba(11,13,20,0.3)",fontSize:"11px"}}>◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <nav className="bg-brand-dark/90 backdrop-blur-sm border-b border-brand-border">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 hover:opacity-85 transition-opacity">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/LOGO.png" alt="PADS" className="w-10 h-10 object-contain" />
              <span className="font-heading text-base sm:text-lg font-bold text-white tracking-wide whitespace-nowrap hidden sm:block">
                Par amour du <span className="text-brand-orange">spin</span>
              </span>
            </Link>
            <Link href="/pilotes" className="hidden sm:block text-sm text-brand-muted hover:text-white transition-colors">Pilotes</Link>
            <Link href="/lives" className="hidden sm:flex items-center gap-1.5 text-sm text-brand-muted hover:text-white transition-colors">
              <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
              Lives
            </Link>
            <Link href="/classement" className="hidden sm:block text-sm text-brand-muted hover:text-white transition-colors">Classement</Link>
            <Link href="/race-history" className="hidden sm:block text-sm text-brand-muted hover:text-white transition-colors">📚 Historique</Link>
            <Link href="/records" className="hidden sm:block text-sm text-brand-muted hover:text-white transition-colors">🏆 Records</Link>
            <Link href="/partenariats" className="hidden sm:block text-sm text-brand-muted hover:text-white transition-colors">Partenariats</Link>
            <a href={boutiqueUrl} target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-brand-orange hover:text-brand-orange/80 transition-colors">
              🛒 Boutique
            </a>
          </div>

          <div className="flex items-center gap-3">
            {status === "loading" && <div className="h-8 w-24 rounded-lg bg-brand-border animate-pulse" />}
            {status === "unauthenticated" && (
              <button onClick={() => signIn("discord")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-discord hover:bg-brand-discord/80 text-white text-sm font-medium transition-colors">
                <DiscordIcon />Se connecter
              </button>
            )}
            {status === "authenticated" && session?.user && (
              <div className="flex items-center gap-3">
                {session.user.role === "ADMIN" && (
                  <Link href="/admin" className="px-3 py-1.5 rounded-lg bg-brand-orange/10 border border-brand-orange/30 text-brand-orange text-sm font-medium hover:bg-brand-orange/20 transition-colors">Admin</Link>
                )}
                <Link href={`/pilotes/${encodeURIComponent(session.user.name ?? "")}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {session.user.image ? (
                    <Image src={session.user.image} alt={session.user.name ?? "Avatar"} width={32} height={32} className="rounded-full ring-2 ring-brand-border" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-brand-discord flex items-center justify-center text-white text-xs font-bold">
                      {session.user.name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <span className="text-brand-text text-sm hidden md:block">{session.user.name}</span>
                </Link>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="hidden lg:block px-3 py-1.5 rounded-lg border border-brand-border text-brand-muted text-sm hover:border-brand-text hover:text-brand-text transition-colors">Déconnexion</button>
                <button onClick={() => signOut({ callbackUrl: "/" })} className="lg:hidden p-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text transition-colors" aria-label="Déconnexion">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </div>
            )}
            <button onClick={() => setMobileOpen((o) => !o)} className="sm:hidden p-1.5 rounded-lg border border-brand-border text-brand-muted hover:text-white transition-colors" aria-label="Menu">
              {mobileOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-brand-border bg-brand-dark px-4 py-3 flex flex-col gap-1">
          <Link href="/pilotes" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-lg text-sm text-brand-muted hover:text-white hover:bg-brand-surface transition-colors">Pilotes</Link>
          <Link href="/lives" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-brand-muted hover:text-white hover:bg-brand-surface transition-colors">
            <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />Lives
          </Link>
          <Link href="/classement" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-lg text-sm text-brand-muted hover:text-white hover:bg-brand-surface transition-colors">Classement</Link>
          <Link href="/race-history" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-lg text-sm text-brand-muted hover:text-white hover:bg-brand-surface transition-colors">📚 Historique</Link>
          <Link href="/records" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-lg text-sm text-brand-muted hover:text-white hover:bg-brand-surface transition-colors">🏆 Records</Link>
          <Link href="/partenariats" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-lg text-sm text-brand-muted hover:text-white hover:bg-brand-surface transition-colors">Partenariats</Link>
          <a href={boutiqueUrl} target="_blank" rel="noopener noreferrer" onClick={() => setMobileOpen(false)} className="px-3 py-2.5 rounded-lg text-sm font-semibold text-brand-orange hover:bg-brand-surface transition-colors">
            🛒 Boutique PADS
          </a>
        </div>
      )}

      <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.892 19.892 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
