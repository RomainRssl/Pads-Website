import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: { username: "asc" },
    include: { team: { select: { id: true, name: true } } },
  });
  return NextResponse.json(players);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username, discordId, teamId } = await req.json();
  if (!username || typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "Username requis." }, { status: 400 });
  }

  try {
    const player = await prisma.player.create({
      data: {
        username: username.trim(),
        discordId: discordId?.trim() || null,
        teamId: teamId || null,
      },
      include: { team: { select: { id: true, name: true } } },
    });
    return NextResponse.json(player, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: `Le pilote "${username.trim()}" existe déjà.` },
      { status: 409 }
    );
  }
}
