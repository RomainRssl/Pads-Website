import { prisma } from "@/lib/prisma";
import LicenseManager from "@/components/admin/LicenseManager";
import { DEFAULT_LICENSES } from "@/lib/license";

export const metadata = { title: "Licences — Admin" };

export default async function LicensesPage() {
  let licenses = await prisma.licenseConfig.findMany({ orderBy: { order: "asc" } });
  if (licenses.length === 0) {
    await prisma.licenseConfig.createMany({ data: DEFAULT_LICENSES });
    licenses = await prisma.licenseConfig.findMany({ orderBy: { order: "asc" } });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">Licences</h1>
        <p className="text-brand-muted mt-1">
          Configurez les seuils XP pour chaque niveau de licence. Les fiches pilotes se mettent à jour automatiquement.
        </p>
      </div>
      <div className="bg-brand-card border border-brand-border rounded-xl p-6 sm:p-8 max-w-2xl">
        <LicenseManager initialLicenses={licenses} />
      </div>
    </div>
  );
}
