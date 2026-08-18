import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENDURANCE_CAR_CLASSES } from "@/lib/endurance";
import { notifyNewEndurance } from "@/lib/endurance-notify";
import { NextResponse } from "next/server";
import { z } from "zod";

const createEnduranceSchema = z.object({
  title: z.string().min(1).max(200),
  track: z.string().min(1).max(150),
  carClasses: z.array(z.enum(ENDURANCE_CAR_CLASSES)).min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const endurances = await prisma.endurance.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { availabilities: true, groups: true } } },
  });

  return NextResponse.json(endurances);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createEnduranceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (endDate <= startDate) {
    return NextResponse.json(
      { error: "La date de fin doit être après la date de début" },
      { status: 400 }
    );
  }

  const endurance = await prisma.endurance.create({
    data: {
      title: parsed.data.title,
      track: parsed.data.track,
      carClasses: JSON.stringify(parsed.data.carClasses),
      startDate,
      endDate,
      createdById: session.user.discordId,
    },
  });

  notifyNewEndurance(endurance).catch((err) =>
    console.error("[endurance] Échec de la notification de création:", err)
  );

  return NextResponse.json(endurance, { status: 201 });
}
