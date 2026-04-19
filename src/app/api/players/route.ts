import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const players = await prisma.player.findMany({
    orderBy: { xp: "desc" },
    include: {
      team: { select: { id: true, name: true } },
      categories: { include: { category: true } },
    },
  });
  return NextResponse.json(players);
}
