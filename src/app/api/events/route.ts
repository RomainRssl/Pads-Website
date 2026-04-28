import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEventNotification } from "@/lib/discord-webhook";
import { NextResponse } from "next/server";
import { z } from "zod";

const createEventSchema = z.object({
  title: z.string().min(1).max(100),
  date: z.string().datetime(),
  game: z.string().min(1).max(60),
  track: z.string().min(1).max(60),
  car: z.string().min(1).max(60),
  description: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
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
      ...parsed.data,
      date: new Date(parsed.data.date),
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl || null,
      createdById: session.user.discordId,
    },
  });

  sendEventNotification(event).catch((err) =>
    console.error("[webhook] Failed to send Discord notification:", err)
  );

  return NextResponse.json(event, { status: 201 });
}
