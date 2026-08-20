import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENDURANCE_CAR_CLASSES, parseStartTimes } from "@/lib/endurance";
import { NextResponse } from "next/server";
import { z } from "zod";

const createAvailabilitySchema = z.object({
  carClass: z.enum(ENDURANCE_CAR_CLASSES),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
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
  const endTime = new Date(parsed.data.endTime);
  if (endTime <= startTime) {
    return NextResponse.json(
      { error: "L'heure de fin doit être après l'heure de début" },
      { status: 400 }
    );
  }

  const allowedTimes = parseStartTimes(endurance.startTimes).map((d) => d.getTime());
  if (!allowedTimes.includes(startTime.getTime()) || !allowedTimes.includes(endTime.getTime())) {
    return NextResponse.json(
      { error: "Choisissez une heure de début et de fin parmi les créneaux proposés par les organisateurs" },
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
