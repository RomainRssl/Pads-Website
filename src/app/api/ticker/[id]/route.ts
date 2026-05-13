import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function DELETE(_: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await props.params;
  await prisma.tickerItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await props.params;
  const { active } = await req.json();
  const item = await prisma.tickerItem.update({ where: { id }, data: { active } });
  return NextResponse.json(item);
}
