import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENDURANCE_CAR_CLASSES, parseStartTimes, computeStintEnd } from "@/lib/endurance";
import { notifyGroupInvite } from "@/lib/endurance-notify";
import { NextResponse } from "next/server";
import { z } from "zod";

const createGroupSchema = z.object({
  teamName: z.string().min(1).max(100),
  carClass: z.enum(ENDURANCE_CAR_CLASSES),
  startTime: z.string().datetime(),
  availabilityIds: z.array(z.string()).min(1).max(20),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (!session.user.enduranceAccess && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const groups = await prisma.enduranceGroup.findMany({
    where: { enduranceId: id, status: { in: ["PENDING", "CONFIRMED"] } },
    include: { members: { include: { user: { select: { id: true, name: true, image: true } } } } },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(groups);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || (!session.user.enduranceAccess && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const endurance = await prisma.endurance.findUnique({ where: { id } });
  if (!endurance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = createGroupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const startTime = new Date(parsed.data.startTime);

  const allowedTimes = parseStartTimes(endurance.startTimes).map((d) => d.getTime());
  if (!allowedTimes.includes(startTime.getTime())) {
    return NextResponse.json(
      { error: "Choisissez une heure de départ parmi celles proposées par les organisateurs" },
      { status: 400 }
    );
  }

  // La fin du relais est calculée automatiquement (essais + qualifs fixes +
  // temps de course défini par l'admin), pas choisie par le créateur.
  const endTime = computeStintEnd(startTime, endurance.raceDurationHours);

  const slots = await prisma.enduranceAvailability.findMany({
    where: { id: { in: parsed.data.availabilityIds }, enduranceId: id },
    include: { user: { select: { id: true, discordId: true, name: true } } },
  });

  if (slots.length !== parsed.data.availabilityIds.length) {
    return NextResponse.json({ error: "Créneau introuvable" }, { status: 404 });
  }

  const seenUsers = new Set<string>();
  for (const slot of slots) {
    if (slot.locked) {
      return NextResponse.json(
        { error: `Le créneau de ${slot.user.name ?? "un pilote"} n'est plus disponible` },
        { status: 409 }
      );
    }
    if (slot.carClass !== parsed.data.carClass) {
      return NextResponse.json(
        { error: `${slot.user.name ?? "Un pilote"} n'est pas disponible pour cette catégorie` },
        { status: 409 }
      );
    }
    // La dispo d'un pilote correspond à un départ précis (son startTime), pas
    // à une plage — son endTime ("jusqu'au prochain départ") n'a aucun lien
    // avec la durée réelle du relais et ne doit pas être comparé à celle-ci.
    if (slot.startTime.getTime() !== startTime.getTime()) {
      return NextResponse.json(
        { error: `${slot.user.name ?? "Un pilote"} n'est pas disponible sur ce créneau` },
        { status: 409 }
      );
    }
    if (seenUsers.has(slot.userId)) {
      return NextResponse.json({ error: "Un pilote ne peut être sélectionné qu'une fois" }, { status: 409 });
    }
    seenUsers.add(slot.userId);
  }

  const group = await prisma.$transaction(async (tx) => {
    const created = await tx.enduranceGroup.create({
      data: {
        enduranceId: id,
        teamName: parsed.data.teamName,
        carClass: parsed.data.carClass,
        startTime,
        endTime,
        createdById: session.user.id,
      },
    });

    for (const slot of slots) {
      await tx.enduranceAvailability.update({ where: { id: slot.id }, data: { locked: true } });
      await tx.enduranceGroupMember.create({
        data: {
          groupId: created.id,
          userId: slot.userId,
          availabilityId: slot.id,
          status: slot.userId === session.user.id ? "CONFIRMED" : "PENDING",
          respondedAt: slot.userId === session.user.id ? new Date() : null,
        },
      });
    }

    return created;
  });

  const invitees = slots.filter((s) => s.userId !== session.user.id && s.user.discordId);
  await Promise.all(
    invitees.map((s) => notifyGroupInvite(group, s.user.discordId!))
  ).catch((err) => console.error("[endurance] Échec des invitations DM:", err));

  return NextResponse.json(group, { status: 201 });
}
