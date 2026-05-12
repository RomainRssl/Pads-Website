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
