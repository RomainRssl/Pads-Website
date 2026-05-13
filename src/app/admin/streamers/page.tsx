import { prisma } from "@/lib/prisma";
import StreamerManager from "@/components/admin/StreamerManager";

export default async function AdminStreamersPage() {
  const raw = await prisma.twitchStreamer.findMany({ orderBy: { addedAt: "asc" } });
  const streamers = raw.map(s => ({
    id: s.id,
    username: s.username,
    displayName: s.displayName,
    addedAt: s.addedAt.toISOString(),
  }));
  return (
    <div className="max-w-xl">
      <div className="section-header">
        <div className="section-bar" />
        <h1 className="section-title">Gestion des streamers</h1>
      </div>
      <StreamerManager initialStreamers={streamers} />
    </div>
  );
}
