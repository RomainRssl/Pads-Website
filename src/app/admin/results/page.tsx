import ResultsUploadForm from "@/components/admin/ResultsUploadForm";

export const metadata = { title: "Résultats de course — Admin" };

export default function ResultsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">
          Traitement des résultats
        </h1>
        <p className="text-brand-muted mt-1">
          Importez un fichier JSON ou CSV pour calculer et sauvegarder les récompenses.
        </p>
      </div>

      {/* Formula info card */}
      <div className="bg-brand-card border border-brand-border rounded-xl p-5 mb-8 max-w-2xl">
        <h2 className="font-heading text-base font-semibold text-white mb-3">Formule de récompenses</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-brand-muted mb-1">XP de base</p>
            <p className="font-mono text-brand-text">durée × 10</p>
          </div>
          <div>
            <p className="text-brand-muted mb-1">Bonus position</p>
            <p className="font-mono text-brand-text">base × (N−pos) / N</p>
          </div>
          <div>
            <p className="text-brand-muted mb-1">Bonus course propre</p>
            <p className="font-mono text-brand-text">+10% XP</p>
          </div>
        </div>
        <p className="text-brand-muted text-xs mt-3">
          Argent = XP total × 0,5 · L'XP est également reversé à la Team du joueur.
        </p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-6 sm:p-8">
        <ResultsUploadForm />
      </div>
    </div>
  );
}
