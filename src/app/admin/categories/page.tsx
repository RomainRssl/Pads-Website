import { prisma } from "@/lib/prisma";
import CategoryManager from "@/components/admin/CategoryManager";

export const metadata = { title: "Catégories — Admin" };

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">Catégories</h1>
        <p className="text-brand-muted mt-1">
          Gérez les catégories de course (LMGT3, GTE, LMP3…). Elles apparaissent comme cases à cocher sur chaque fiche pilote.
        </p>
      </div>
      <div className="bg-brand-card border border-brand-border rounded-xl p-6 sm:p-8 max-w-xl">
        <CategoryManager initialCategories={categories} />
      </div>
    </div>
  );
}
