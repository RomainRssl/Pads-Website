import { prisma } from "@/lib/prisma";
import LiveMultiplex from "@/components/lives/LiveMultiplex";

export const metadata = {
  title: "Lives — Par amour du spin",
  description: "Regardez les streams Twitch de nos membres en direct, seul ou en multiplex.",
};

export default async function LivesPage() {
  const streamers = await prisma.twitchStreamer.findMany({
    orderBy: { addedAt: "asc" },
  });

  const initialUsernames = streamers.map((s) => s.username);

  if (streamers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center px-4">
        <p className="text-6xl mb-4">📺</p>
        <h1 className="font-heading text-3xl font-bold text-white mb-3">
          Multiplex Live
        </h1>
        <p className="text-brand-muted max-w-md">
          Aucun streamer n'a encore été ajouté à la liste.
          <br />
          Les admins peuvent en ajouter depuis le panel d'administration.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Page header */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-brand-border bg-brand-dark flex items-center gap-3">
        <h1 className="font-heading text-lg font-bold text-white">
          📺 Multiplex Live
        </h1>
        <span className="text-brand-muted text-sm hidden sm:block">
          Sélectionnez jusqu'à 4 streams à regarder simultanément
        </span>
      </div>

      <LiveMultiplex initialUsernames={initialUsernames} />
    </div>
  );
}
