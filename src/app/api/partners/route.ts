import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
  const partners = await prisma.partner.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(partners);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, url, logoUrl, discountCode, description } = await req.json();
  const count = await prisma.partner.count();
  const partner = await prisma.partner.create({
    data: { name, url: url || null, logoUrl: logoUrl || null, discountCode: discountCode || null, description: description || null, order: count },
  });
  return NextResponse.json(partner);
}
