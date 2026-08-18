import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; slotId: string }> }
) {
  const session = await auth();
  if (!session || (!session.user.enduranceAccess && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slotId } = await params;
  const slot = await prisma.enduranceAvailability.findUnique({ where: { id: slotId } });
  if (!slot || slot.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (slot.locked) {
    return NextResponse.json(
      { error: "Ce créneau est engagé dans un équipage, annulez l'équipage pour le libérer" },
      { status: 409 }
    );
  }

  await prisma.enduranceAvailability.delete({ where: { id: slotId } });
  return new Response(null, { status: 204 });
}
