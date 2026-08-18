import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyGroupCancelled } from "@/lib/endurance-notify";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session || (!session.user.enduranceAccess && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { groupId } = await params;
  const group = await prisma.enduranceGroup.findUnique({
    where: { id: groupId },
    include: { members: { include: { user: { select: { id: true, discordId: true } } } } },
  });
  if (!group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (group.status === "CANCELLED") {
    return NextResponse.json({ ok: true });
  }

  const isMember = group.members.some((m) => m.userId === session.user.id);
  if (!isMember && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Vous ne faites pas partie de cet équipage" }, { status: 403 });
  }

  await prisma.$transaction([
    prisma.enduranceGroup.update({ where: { id: group.id }, data: { status: "CANCELLED" } }),
    prisma.enduranceAvailability.updateMany({
      where: { groupMembers: { some: { groupId: group.id } } },
      data: { locked: false },
    }),
  ]);

  const actorName = session.user.name ?? "Un pilote";
  await Promise.all(
    group.members
      .filter((m) => m.userId !== session.user.id && m.user.discordId)
      .map((m) => notifyGroupCancelled(group, m.user.discordId!, actorName))
  ).catch((err) => console.error("[endurance] Échec notification annulation:", err));

  return NextResponse.json({ ok: true });
}
