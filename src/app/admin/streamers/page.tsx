import { prisma } from "@/lib/prisma";
import StreamerManager from "@/components/admin/StreamerManager";
export default async function AdminStreamersPage() {
  const streamers=await prisma.twitchStreamer.findMany({orderBy:{createdAt:"asc"}});
  return <div className="max-w-xl"><div className="section-header"><div className="section-bar"/><h1 className="section-title">Gestion des streamers</h1></div><StreamerManager initialStreamers={streamers}/></div>;
}
