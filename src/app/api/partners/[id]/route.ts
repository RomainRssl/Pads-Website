import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { name, url, logoUrl, discountCode, description } = await req.json();
  const partner = await prisma.partner.update({
    where: { id },
    data: { name, url: url || null, logoUrl: logoUrl || null, discountCode: discountCode || null, description: description || null },
  });
  return NextResponse.json(partner);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.partner.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
