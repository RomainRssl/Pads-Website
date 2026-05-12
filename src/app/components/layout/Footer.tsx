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
