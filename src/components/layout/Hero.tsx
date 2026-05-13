import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function Hero() {
  const playerCount = await prisma.player.count();
  const eventCount  = await prisma.event.count({ where: { date: { gte: new Date() } } });

  return (
    <section className="relative bg-brand-navy overflow-hidden border-b border-brand-border">
      <div className="absolute inset-0 bg-racing-grid bg-grid opacity-60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-2/3 h-px bg-gradient-to-r from-brand-orange to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6 py-16">
        <p className="font-heading font-bold text-xs uppercase tracking-[0.25em] text-brand-orange mb-3">Sim Racing · France · LMU</p>

        <h1 className="font-heading font-bold text-6xl md:text-7xl uppercase leading-none text-brand-text mb-6">
          Par amour<br />du <span className="text-brand-orange">spin&nbsp;!</span>
        </h1>

        {/* Logo */}
        <div className="mb-6">
          <Image src="/LOGO.png" alt="PADS" width={150} height={150} className="rounded-full" />
        </div>

        <p className="font-body text-sm text-brand-muted max-w-md leading-relaxed mb-8">
          La communauté française dédiée à la simulation de course. Courses organisées, championnats, et fun sur circuit.
        </p>

        {/* CTA + QR */}
        <div className="flex items-center gap-6 flex-wrap">
          <Link
            href="https://discord.gg/AmMRGSbaV"
            target="_blank"
            className="flex items-center gap-2 bg-brand-orange text-brand-navy font-heading font-bold text-xs uppercase tracking-widest px-5 py-2.5 rounded-sm hover:bg-brand-orange2 transition-colors"
          >
            Rejoindre le serveur
          </Link>
          <div className="flex items-center gap-3">
            <Image src="/IMG/qr-discord.png" alt="QR Discord" width={96} height={96} className="rounded-sm" />
            <p className="font-heading text-xs text-brand-muted uppercase tracking-widest">Scanner<br/>pour rejoindre</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-8 mt-10 pt-8 border-t border-brand-border">
          <div className="flex flex-col">
            <span className="font-heading font-bold text-3xl text-brand-orange leading-none">LMU</span>
            <span className="font-heading text-xs uppercase tracking-widest text-brand-muted mt-1">Plateforme</span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-3xl text-brand-text leading-none">{playerCount}</span>
            <span className="font-heading text-xs uppercase tracking-widest text-brand-muted mt-1">Pilotes</span>
          </div>
          <div className="flex flex-col">
            <span className="font-heading font-bold text-3xl text-brand-text leading-none">{eventCount}</span>
            <span className="font-heading text-xs uppercase tracking-widest text-brand-muted mt-1">Course{eventCount > 1 ? "s" : ""} à venir</span>
          </div>
        </div>
      </div>
    </section>
  );
}
