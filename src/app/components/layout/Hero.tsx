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
