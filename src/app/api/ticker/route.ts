import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const items = await prisma.tickerItem.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { text } = await req.json();
  const count = await prisma.tickerItem.count();
  const item = await prisma.tickerItem.create({ data: { text, order: count, active: true } });
  return NextResponse.json(item);
}
