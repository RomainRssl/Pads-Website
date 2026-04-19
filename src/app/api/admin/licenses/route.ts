import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { DEFAULT_LICENSES } from "@/lib/license";

async function ensureDefaults() {
  const count = await prisma.licenseConfig.count();
  if (count === 0) {
    await prisma.licenseConfig.createMany({ data: DEFAULT_LICENSES });
  }
}

export async function GET() {
  await ensureDefaults();
  const licenses = await prisma.licenseConfig.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(licenses);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, label, minXp, color, order } = await req.json();
  if (!id || !label || minXp === undefined) {
    return NextResponse.json({ error: "Champs requis manquants." }, { status: 400 });
  }

  const license = await prisma.licenseConfig.upsert({
    where: { id },
    update: { label, minXp: Number(minXp), color: color ?? "#CD7F32", order: Number(order ?? 0) },
    create: { id, label, minXp: Number(minXp), color: color ?? "#CD7F32", order: Number(order ?? 0) },
  });
  return NextResponse.json(license);
}
