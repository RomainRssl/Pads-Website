import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;

  const player = await prisma.player.findUnique({
    where: { username },
    include: {
      team: { select: { id: true, name: true } },
      categories: { include: { category: true }, },
    },
  });

  if (!player) return NextResponse.json({ error: "Pilote introuvable." }, { status: 404 });
  return NextResponse.json(player);
}
