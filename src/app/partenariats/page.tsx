import { prisma } from "@/lib/prisma";

export const metadata = { title: "Partenariats — Par amour du spin" };

export default async function PartenariatsPage() {
  const partners = await prisma.partner.findMany({ orderBy: { order: "asc" } });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-heading text-3xl font-bold text-white mb-2">Partenariats</h1>
      <p className="text-brand-muted text-sm mb-10">Nos partenaires qui soutiennent la communauté PADS.</p>

      {partners.length === 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-2xl p-10 text-center text-brand-muted">
          Aucun partenaire pour le moment.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {partners.map((p) => (
          <div key={p.id} className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden flex flex-col">
            {/* Logo */}
            {p.logoUrl && (
              <div className="bg-brand-dark flex items-center justify-center p-6 border-b border-brand-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.logoUrl} alt={p.name} className="max-h-24 max-w-full object-contain" />
              </div>
            )}

            <div className="p-6 flex flex-col gap-3 flex-1">
              {/* Name */}
              <h2 className="font-heading text-xl font-bold text-white">{p.name}</h2>

              {/* Description */}
              {p.description && (
                <p className="text-brand-muted text-sm leading-relaxed">{p.description}</p>
              )}

              {/* Discount code */}
              {p.discountCode && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-brand-muted uppercase font-semibold tracking-wider">Code réduction</span>
                  <span className="font-mono font-bold text-brand-orange bg-brand-orange/10 border border-brand-orange/30 px-2.5 py-1 rounded-lg text-sm tracking-widest">
                    {p.discountCode}
                  </span>
                </div>
              )}

              {/* Link */}
              {p.url && (
                <div className="mt-auto pt-3">
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-orange text-black text-sm font-bold hover:bg-brand-orange/90 transition-colors"
                  >
                    Visiter le site
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
