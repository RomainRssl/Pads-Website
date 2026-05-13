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
          Importez un fichier XML (LMU), JSON ou CSV pour calculer et sauvegarder les récompenses.
        </p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-6 sm:p-8">
        <ResultsUploadForm />
      </div>
    </div>
  );
}
