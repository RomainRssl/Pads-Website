import { isSetupComplete } from "@/lib/config";
import Link from "next/link";

export const metadata = { title: "Configuration — Par amour du spin" };

function buildDiscordSetupUrl(): string {
  const clientId = process.env.DISCORD_CLIENT_ID!;
  const redirectUri = encodeURIComponent(
    `${process.env.NEXTAUTH_URL}/api/setup/callback`
  );
  const scopes = encodeURIComponent("bot webhook.incoming");
  // permissions=0 : aucune permission spéciale (le bot rejoint juste le serveur)
  return `https://discord.com/oauth2/authorize?client_id=${clientId}&scope=${scopes}&permissions=0&redirect_uri=${redirectUri}&response_type=code`;
}

export default async function SetupPage() {
  const alreadyConfigured = await isSetupComplete();
  const setupUrl = buildDiscordSetupUrl();

  if (alreadyConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-brand-card border border-green-500/30 rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="font-heading text-2xl font-bold text-white mb-2">
            Configuration terminée
          </h1>
          <p className="text-brand-muted mb-6">
            Le serveur Discord est déjà connecté. Vous pouvez reconfigurer si nécessaire.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href={setupUrl}
              className="px-4 py-2.5 rounded-lg bg-brand-discord hover:bg-brand-discord/80 text-white font-semibold text-sm transition-colors text-center"
            >
              Reconfigurer le serveur Discord
            </a>
            <Link
              href="/"
              className="px-4 py-2.5 rounded-lg border border-brand-border text-brand-muted hover:text-brand-text transition-colors text-sm text-center"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-4xl mb-4">🏁</p>
          <h1 className="font-heading text-4xl font-bold text-white mb-3">
            Configuration initiale
          </h1>
          <p className="text-brand-muted text-lg">
            Connectez votre serveur Discord en une seule étape
          </p>
        </div>

        {/* Card */}
        <div className="bg-brand-card border border-brand-border rounded-xl p-6 sm:p-8 mb-6">
          <h2 className="font-heading text-lg font-semibold text-white mb-4">
            Ce que Discord va configurer automatiquement :
          </h2>
          <ul className="space-y-3 mb-8">
            {[
              { icon: "🤖", label: "Le bot rejoint votre serveur" },
              { icon: "📢", label: "Un webhook est créé dans le salon de votre choix" },
              { icon: "🆔", label: "L'ID de votre serveur est récupéré automatiquement" },
            ].map(({ icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-brand-text">
                <span className="text-xl">{icon}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <a
            href={setupUrl}
            className="flex items-center justify-center gap-3 w-full px-6 py-3.5 rounded-xl bg-brand-discord hover:bg-brand-discord/80 text-white font-bold text-lg transition-colors shadow-lg"
          >
            <DiscordIcon />
            Connecter au serveur Discord
          </a>
        </div>

        {/* Step 2 preview */}
        <div className="bg-brand-surface border border-brand-border rounded-xl p-5">
          <p className="text-brand-muted text-sm">
            <span className="text-white font-medium">Étape suivante :</span>{" "}
            après avoir autorisé Discord, vous choisirez quel rôle de votre serveur donne accès au panel admin.
          </p>
        </div>

        {/* Prerequisite note */}
        <p className="text-center text-brand-muted text-xs mt-4">
          Prérequis : ajoutez{" "}
          <code className="text-brand-text bg-brand-surface px-1 rounded">
            {process.env.NEXTAUTH_URL}/api/setup/callback
          </code>{" "}
          dans les Redirects de votre application Discord.
        </p>
      </div>
    </div>
  );
}

function DiscordIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.055a19.892 19.892 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}
