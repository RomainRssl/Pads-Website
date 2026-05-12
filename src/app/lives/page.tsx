import { prisma } from "@/lib/prisma";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import LiveMultiplex from "@/components/lives/LiveMultiplex";

export const revalidate = 0;

export default async function LivesPage() {
  const raw = await prisma.twitchStreamer.findMany({ orderBy:{ addedAt:"asc" } });
  const streamers = raw.map(s => ({
    id: s.id,
    twitchUsername: s.username,
    displayName: s.displayName,
  }));
  return (
    <main className="min-h-screen bg-brand-navy flex flex-col pt-16">
      <Navbar />
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        <div className="section-header mb-6">
          <div className="section-bar"/><h1 className="section-title">Lives</h1>
          <span className="font-heading text-xs text-brand-muted ml-auto">Jusqu&apos;à 10 streams simultanés</span>
        </div>
        <LiveMultiplex streamers={streamers} />
      </div>
      <Footer />
    </main>
  );
}
