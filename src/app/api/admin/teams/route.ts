import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const teams = await prisma.team.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { players: true } } },
  });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nom requis." }, { status: 400 });
  }

  try {
    const team = await prisma.team.create({ data: { name: name.trim() } });
    return NextResponse.json(team, { status: 201 });
  } catch {
    return NextResponse.json({ error: `L'écurie "${name.trim()}" existe déjà.` }, { status: 409 });
  }
}
