import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { username, discordUsername, discordId, teamId, reputation } = await req.json();

  if (username !== undefined) {
    const trimmed = username.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Le pseudo ne peut pas être vide." }, { status: 400 });
    }
    const existing = await prisma.player.findUnique({ where: { username: trimmed } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: `Le pseudo "${trimmed}" est déjà utilisé.` }, { status: 409 });
    }
  }

  const player = await prisma.player.update({
    where: { id },
    data: {
      ...(username !== undefined && { username: username.trim() }),
      ...(discordUsername !== undefined && { discordUsername: discordUsername?.trim() || null }),
      discordId: discordId?.trim() || null,
      teamId: teamId || null,
      ...(reputation !== undefined && { reputation: Math.max(0, Math.min(100, Number(reputation))) }),
    },
    include: { team: { select: { id: true, name: true } } },
  });

  return NextResponse.json(player);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.player.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
