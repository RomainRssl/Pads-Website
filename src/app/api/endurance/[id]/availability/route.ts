import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENDURANCE_CAR_CLASSES, parseStartTimes } from "@/lib/endurance";
import { NextResponse } from "next/server";
import { z } from "zod";

const createAvailabilitySchema = z.object({
  carClass: z.enum(ENDURANCE_CAR_CLASSES),
  startTime: z.string().datetime(),
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

  const [mine, pool] = await Promise.all([
    prisma.enduranceAvailability.findMany({
      where: { enduranceId: id, userId: session.user.id },
      orderBy: { startTime: "asc" },
    }),
    prisma.enduranceAvailability.findMany({
      where: { enduranceId: id, locked: false },
      orderBy: { startTime: "asc" },
      include: { user: { select: { id: true, name: true, image: true } } },
    }),
  ]);

  return NextResponse.json({ mine, pool });
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
  const parsed = createAvailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const startTime = new Date(parsed.data.startTime);

  // Le pilote choisit un seul départ parmi ceux imposés par les organisateurs
  // — la fin du créneau est dérivée automatiquement (jusqu'au départ suivant,
  // ou jusqu'à la fin du week-end pour le dernier départ de la liste).
  const allowedTimes = parseStartTimes(endurance.startTimes);
  const matchIndex = allowedTimes.findIndex((d) => d.getTime() === startTime.getTime());
  if (matchIndex === -1) {
    return NextResponse.json(
      { error: "Choisissez une heure de départ parmi celles proposées par les organisateurs" },
      { status: 400 }
    );
  }
  const endTime = allowedTimes[matchIndex + 1] ?? endurance.endDate;
  if (endTime <= startTime) {
    return NextResponse.json(
      { error: "La fin du week-end doit être après la dernière heure de départ" },
      { status: 400 }
    );
  }

  const availability = await prisma.enduranceAvailability.create({
    data: {
      enduranceId: id,
      userId: session.user.id,
      carClass: parsed.data.carClass,
      startTime,
      endTime,
    },
  });

  return NextResponse.json(availability, { status: 201 });
}
