import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { categoryIds } = await req.json() as { categoryIds: string[] };

  await prisma.playerCategory.deleteMany({ where: { playerId: id } });

  if (categoryIds.length > 0) {
    await prisma.playerCategory.createMany({
      data: categoryIds.map((categoryId) => ({ playerId: id, categoryId })),
    });
  }

  return NextResponse.json({ ok: true });
}
