import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const registerSchema = z.object({
  carClass: z.string().min(1),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const registrations = await prisma.eventRegistration.findMany({
    where: { eventId: id },
    include: {
      user: { select: { id: true, name: true, discordId: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(registrations);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.registrationsClosed) {
    return NextResponse.json({ error: "Registrations are closed" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  let cars: { name: string }[] = [];
  try { cars = JSON.parse(event.cars); } catch { /* ignore */ }
  if (!cars.some((c) => c.name === parsed.data.carClass)) {
    return NextResponse.json({ error: "Invalid car class for this event" }, { status: 400 });
  }

  const registration = await prisma.eventRegistration.upsert({
    where: { eventId_userId: { eventId: id, userId: session.user.id } },
    update: { carClass: parsed.data.carClass },
    create: { eventId: id, userId: session.user.id, carClass: parsed.data.carClass },
  });

  return NextResponse.json(registration, { status: 201 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (event?.registrationsClosed) {
    return NextResponse.json({ error: "Registrations are closed" }, { status: 409 });
  }

  await prisma.eventRegistration.deleteMany({
    where: { eventId: id, userId: session.user.id },
  });
  return new Response(null, { status: 204 });
}
