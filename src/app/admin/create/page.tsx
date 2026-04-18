import CreateEventForm from "@/components/admin/CreateEventForm";

export const metadata = {
  title: "Créer une course — Admin",
};

export default function CreateEventPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">
          Nouvelle course
        </h1>
        <p className="text-brand-muted mt-1">
          Remplissez le formulaire pour créer un événement. Une notification sera envoyée sur Discord.
        </p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-6 sm:p-8">
        <CreateEventForm />
      </div>
    </div>
  );
}
