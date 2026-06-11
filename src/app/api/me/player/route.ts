import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.discordId) {
    return NextResponse.json({ username: null });
  }

  const player = await prisma.player.findUnique({
    where: { discordId: session.user.discordId },
    select: { username: true },
  });

  return NextResponse.json({ username: player?.username ?? null });
}
