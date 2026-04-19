import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { fetchUserInfos } from "@/lib/twitch";

export async function GET() {
  const streamers = await prisma.twitchStreamer.findMany({
    orderBy: { addedAt: "asc" },
  });
  return NextResponse.json(streamers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await req.json();
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "username requis." }, { status: 400 });
  }

  const login = username.trim().toLowerCase();

  // Try to resolve the display name via Twitch API (optional, fail silently)
  let displayName: string | null = null;
  try {
    const users = await fetchUserInfos([login]);
    displayName = users[0]?.displayName ?? null;
  } catch {
    // Twitch creds not set or API error — add without display name
  }

  try {
    const streamer = await prisma.twitchStreamer.create({
      data: { username: login, displayName },
    });
    return NextResponse.json(streamer, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: `Le streamer "${login}" existe déjà.` },
      { status: 409 }
    );
  }
}
