import { prisma } from "@/lib/prisma";
import PartnerManager from "@/components/admin/PartnerManager";

export const metadata = { title: "Partenaires — Admin" };

export default async function AdminPartenairesPage() {
  const partners = await prisma.partner.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-white mb-2">Partenaires</h1>
      <p className="text-brand-muted text-sm mb-8">Gérer les partenaires affichés sur la page publique /partenariats.</p>
      <PartnerManager initialPartners={partners} />
    </div>
  );
}
