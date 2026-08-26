import CircuitsManager from "@/components/admin/CircuitsManager";

export default function CircuitsPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="font-heading text-2xl font-bold text-white mb-2">Circuits</h1>
      <p className="text-brand-muted text-sm mb-8">
        Ajoutez des circuits manuellement et définissez le nombre maximum de pilotes par circuit. La capacité sera pré-remplie automatiquement lors de la création d&apos;une course.
      </p>
      <CircuitsManager />
    </div>
  );
}
