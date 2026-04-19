import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const categories = await prisma.category.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nom requis." }, { status: 400 });
  }

  const count = await prisma.category.count();
  try {
    const category = await prisma.category.create({
      data: { name: name.trim().toUpperCase(), order: count },
    });
    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: `La catégorie "${name.trim()}" existe déjà.` }, { status: 409 });
  }
}
