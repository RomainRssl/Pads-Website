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
