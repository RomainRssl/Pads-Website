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
  const { discordId, teamId } = await req.json();

  const player = await prisma.player.update({
    where: { id },
    data: {
      discordId: discordId?.trim() || null,
      teamId: teamId || null,
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
