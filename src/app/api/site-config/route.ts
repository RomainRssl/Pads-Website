import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  if (key) {
    const cfg = await prisma.siteConfig.findUnique({ where: { key } });
    return NextResponse.json({ value: cfg?.value ?? null });
  }
  const all = await prisma.siteConfig.findMany();
  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { key, value } = await req.json();
  const cfg = await prisma.siteConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return NextResponse.json(cfg);
}
