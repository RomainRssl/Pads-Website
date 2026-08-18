import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notifyGroupConfirmed } from "@/lib/endurance-notify";
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
    return NextResponse.json({ error: "Cet équipage a été annulé" }, { status: 409 });
  }

  const member = group.members.find((m) => m.userId === session.user.id);
  if (!member) {
    return NextResponse.json({ error: "Vous ne faites pas partie de cet équipage" }, { status: 403 });
  }

  await prisma.enduranceGroupMember.update({
    where: { id: member.id },
    data: { status: "CONFIRMED", respondedAt: new Date() },
  });

  const allConfirmed = group.members.every(
    (m) => m.id === member.id || m.status === "CONFIRMED"
  );

  if (allConfirmed) {
    await prisma.enduranceGroup.update({ where: { id: group.id }, data: { status: "CONFIRMED" } });
    await Promise.all(
      group.members
        .filter((m) => m.user.discordId)
        .map((m) => notifyGroupConfirmed(group, m.user.discordId!))
    ).catch((err) => console.error("[endurance] Échec notification confirmation:", err));
  }

  return NextResponse.json({ ok: true, groupStatus: allConfirmed ? "CONFIRMED" : "PENDING" });
}
