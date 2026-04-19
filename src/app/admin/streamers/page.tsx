import { prisma } from "@/lib/prisma";
import StreamerManager from "@/components/admin/StreamerManager";

export const metadata = { title: "Streamers Twitch — Admin" };

export default async function StreamersPage() {
  const streamers = await prisma.twitchStreamer.findMany({
    orderBy: { addedAt: "asc" },
  });

  // Serialize dates for the client component
  const serialized = streamers.map((s) => ({
    ...s,
    addedAt: s.addedAt.toISOString(),
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-white">
          Streamers Twitch
        </h1>
        <p className="text-brand-muted mt-1">
          Gérez la liste des membres diffusés sur la page{" "}
          <a href="/lives" className="text-brand-discord hover:underline">
            /lives
          </a>
          .
        </p>
      </div>

      <div className="bg-brand-card border border-brand-border rounded-xl p-6 sm:p-8">
        <StreamerManager initialStreamers={serialized} />
      </div>

      {/* Info card about Twitch embed */}
      <div className="mt-6 bg-brand-surface border border-brand-border rounded-xl p-5 max-w-2xl">
        <h2 className="font-heading text-base font-semibold text-white mb-2">
          Configuration requise pour les embeds Twitch
        </h2>
        <p className="text-brand-muted text-sm mb-2">
          Pour que les lecteurs Twitch fonctionnent, ajoutez dans votre{" "}
          <code className="text-brand-text bg-brand-dark px-1 rounded">.env.local</code> :
        </p>
        <pre className="text-xs text-brand-text bg-brand-dark rounded-lg p-3 overflow-x-auto">
          {`NEXT_PUBLIC_SITE_DOMAIN="localhost"          # dev
NEXT_PUBLIC_SITE_DOMAIN="votre-domaine.com" # production

TWITCH_CLIENT_ID="..."
TWITCH_CLIENT_SECRET="..."`}
        </pre>
        <p className="text-brand-muted text-xs mt-2">
          Les credentials Twitch sont optionnels (les embeds fonctionnent sans) mais nécessaires pour afficher le statut LIVE et les spectateurs.
        </p>
      </div>
    </div>
  );
}
