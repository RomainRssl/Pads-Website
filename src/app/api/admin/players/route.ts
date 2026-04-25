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

  const { username, discordUsername, discordId, teamId } = await req.json();
  if (!username || typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "Pseudo LMU requis." }, { status: 400 });
  }
  if (!discordId || typeof discordId !== "string" || !discordId.trim()) {
    return NextResponse.json({ error: "Discord ID requis." }, { status: 400 });
  }

  try {
    const player = await prisma.player.create({
      data: {
        username: username.trim(),
        discordUsername: discordUsername?.trim() || null,
        discordId: discordId.trim(),
        teamId: teamId || null,
      },
      include: { team: { select: { id: true, name: true } } },
    });
    return NextResponse.json(player, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Unique constraint") || msg.includes("P2002")) {
      return NextResponse.json(
        { error: `Le pilote "${username.trim()}" existe déjà.` },
        { status: 409 }
      );
    }
    console.error("[POST /api/admin/players]", err);
    return NextResponse.json({ error: "Erreur serveur : " + msg }, { status: 500 });
  }
}
