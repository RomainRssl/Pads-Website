import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Detach players before deleting
  await prisma.player.updateMany({ where: { teamId: id }, data: { teamId: null } });
  await prisma.team.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { name } = await req.json();
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Nom requis." }, { status: 400 });
  }

  try {
    const team = await prisma.team.update({ where: { id }, data: { name: name.trim() } });
    return NextResponse.json(team);
  } catch {
    return NextResponse.json({ error: "Nom déjà utilisé." }, { status: 409 });
  }
}
