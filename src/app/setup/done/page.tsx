import Link from "next/link";

export const metadata = { title: "Configuration terminée — Par amour du spin" };

export default function SetupDonePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-brand-card border border-green-500/30 rounded-xl p-8 text-center">
        <div className="text-6xl mb-4">🏁</div>
        <h1 className="font-heading text-3xl font-bold text-white mb-3">
          Configuration terminée !
        </h1>
        <p className="text-brand-muted mb-2">
          Votre serveur Discord est connecté, le webhook est actif et le rôle admin est configuré.
        </p>
        <p className="text-brand-muted text-sm mb-8">
          Connectez-vous avec Discord pour accéder au panel admin si vous possédez le rôle configuré.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-orange hover:bg-brand-orange/80 text-white font-bold transition-colors"
        >
          Aller sur le site →
        </Link>
      </div>
    </div>
  );
}
