import BoutiqueConfig from "@/components/admin/BoutiqueConfig";

export const metadata = { title: "Boutique — Admin" };

export default function AdminBoutiquePage() {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-white mb-2">Boutique PADS</h1>
      <p className="text-brand-muted text-sm mb-8">Gérer le lien vers la boutique affiché dans la navigation.</p>
      <BoutiqueConfig />
    </div>
  );
}
