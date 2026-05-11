import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEventNotification } from "@/lib/discord-webhook";
import { NextResponse } from "next/server";
import { z } from "zod";

// A car entry is either a plain string (legacy) or { name, maxCars? }
const carEntrySchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    maxCars: z.number().int().min(1).nullable().optional(),
  }),
]);

const createEventSchema = z.object({
  title: z.string().min(1).max(100),
  date: z.string().datetime(),
  game: z.string().min(1).max(60),
  track: z.string().min(1).max(60),
  cars: z.array(carEntrySchema).min(1).max(5),
  description: z.string().max(500).optional(),
  imageUrl: z.string().optional().or(z.literal("")),
  serverName: z.string().max(100).optional().or(z.literal("")),
  serverPassword: z.string().max(100).optional().or(z.literal("")),
});

export async function GET() {
  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(events);
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const event = await prisma.event.create({
    data: {
      title: parsed.data.title,
      date: new Date(parsed.data.date),
      game: parsed.data.game,
      track: parsed.data.track,
      // Persist as JSON — supports both legacy strings and new { name, maxCars } objects
      cars: JSON.stringify(parsed.data.cars),
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl || null,
      serverName: parsed.data.serverName || null,
      serverPassword: parsed.data.serverPassword || null,
      createdById: session.user.discordId,
    },
  });

  sendEventNotification(event).catch((err) =>
    console.error("[webhook] Failed to send Discord notification:", err)
  );

  return NextResponse.json(event, { status: 201 });
}
