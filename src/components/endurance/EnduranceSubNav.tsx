"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EnduranceSubNav({ enduranceId, title }: { enduranceId: string; title: string }) {
  const pathname = usePathname();
  const links = [
    { href: `/endurance/${enduranceId}/disponibilites`, label: "🕒 Mes dispos" },
    { href: `/endurance/${enduranceId}/equipe`, label: "👥 Équipages" },
    { href: `/endurance/${enduranceId}/calendrier`, label: "📅 Calendrier" },
  ];

  return (
    <div className="space-y-3 mb-6">
      <Link href="/endurance" className="text-xs text-brand-muted hover:text-brand-text transition-colors">← Toutes les endurances</Link>
      <h1 className="font-heading text-2xl font-bold text-white">{title}</h1>
      <nav className="flex gap-2 flex-wrap">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              pathname === l.href
                ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                : "border-brand-border text-brand-muted hover:text-brand-text"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
