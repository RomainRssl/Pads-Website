import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchStreamersStatus } from "@/lib/twitch";

export const dynamic = "force-dynamic"; // Always fresh — no caching

export async function GET() {
  const dbStreamers = await prisma.twitchStreamer.findMany({
    orderBy: { addedAt: "asc" },
  });

  if (!dbStreamers.length) {
    return NextResponse.json({ streamers: [] });
  }

  const logins = dbStreamers.map((s) => s.username);

  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    console.warn("[twitch/live] TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET is not set — all streamers will appear offline.");
  }

  let statuses;
  try {
    statuses = await fetchStreamersStatus(logins);
    const liveCount = statuses.filter((s) => s.isLive).length;
    console.log(`[twitch/live] ${liveCount}/${logins.length} streamer(s) live: ${statuses.filter(s => s.isLive).map(s => s.login).join(", ") || "none"}`);
  } catch (err) {
    console.error("[twitch/live] API error:", err);
    // Graceful fallback: return streamers without live status
    statuses = logins.map((login) => ({
      login,
      displayName: dbStreamers.find((s) => s.username === login)?.displayName ?? login,
      profileImageUrl: "",
      isLive: false,
    }));
  }

  // Merge DB id into each status entry
  const dbMap = new Map(dbStreamers.map((s) => [s.username.toLowerCase(), s]));
  const streamers = statuses.map((s) => ({
    ...s,
    id: dbMap.get(s.login)?.id ?? "",
    dbDisplayName: dbMap.get(s.login)?.displayName,
  }));

  return NextResponse.json({ streamers });
}
