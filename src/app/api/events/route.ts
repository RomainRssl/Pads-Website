import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEventNotification } from "@/lib/discord-webhook";
import { NextResponse } from "next/server";
import { z } from "zod";

// ── Helpers ───────────────────────────────────────────────────────────────────

interface CarClass {
  name: string;
  max_places: number | null;
}

/**
 * Parse whatever is stored in event.cars (legacy string[] or object[])
 * and always return the canonical { name, max_places } format.
 */
function parseCars(raw: string): CarClass[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      if (typeof item === "string") return { name: item, max_places: null };
      if (typeof item === "object" && item !== null) {
        return {
          name: String(item.name ?? ""),
          // accept max_places (canonical) or maxCars (transitional)
          max_places: item.max_places ?? item.maxCars ?? null,
        };
      }
      return { name: String(item), max_places: null };
    });
  } catch {
    return [];
  }
}

/** Enrich a raw Prisma event with parsed classes_with_limits */
function enrichEvent(event: { cars: string; [key: string]: unknown }) {
  return {
    ...event,
    classes_with_limits: parseCars(event.cars),
  };
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const carEntrySchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    // accept both field names from the form
    max_places: z.number().int().min(1).nullable().optional(),
    maxCars: z.number().int().min(1).nullable().optional(),
  }),
]);

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  date: z.string().datetime(),
  game: z.string().min(1).max(100),
  track: z.string().min(1).max(100),
  cars: z.array(carEntrySchema).min(1).max(5),
  description: z.string().max(500).optional(),
  imageUrl: z.string().optional().or(z.literal("")),
  serverName: z.string().max(100).optional().or(z.literal("")),
  serverPassword: z.string().max(100).optional().or(z.literal("")),
  splitMode: z.enum(["RANKED", "RANDOM", "MANUAL"]).default("RANKED"),
  trackCapacity: z.number().int().min(1).nullable().optional(),
  freeSlots: z.number().int().min(0).default(0),
  // ── Affiche ─────────────────────────────────────────────────────────────
  weekNumber: z.number().int().min(1).max(53).nullable().optional(),
  posterAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  entryCredits: z.number().int().min(0).nullable().optional(),
  raceDuration: z.number().int().min(1).nullable().optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

export async function GET() {
  const events = await prisma.event.findMany({
    where: { date: { gte: new Date() } },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(events.map(enrichEvent));
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

  // Normalize all car entries to { name, max_places } before storing
  const normalizedCars: CarClass[] = parsed.data.cars.map((c) => {
    if (typeof c === "string") return { name: c, max_places: null };
    return {
      name: c.name,
      max_places: c.max_places ?? c.maxCars ?? null,
    };
  });

  const event = await prisma.event.create({
    data: {
      title: parsed.data.title,
      date: new Date(parsed.data.date),
      game: parsed.data.game,
      track: parsed.data.track,
      cars: JSON.stringify(normalizedCars),
      description: parsed.data.description ?? null,
      imageUrl: parsed.data.imageUrl || null,
      serverName: parsed.data.serverName || null,
      serverPassword: parsed.data.serverPassword || null,
      splitMode: parsed.data.splitMode,
      trackCapacity: parsed.data.trackCapacity ?? null,
      freeSlots: parsed.data.freeSlots,
      weekNumber: parsed.data.weekNumber ?? null,
      posterAccent: parsed.data.posterAccent ?? "#F07000",
      entryCredits: parsed.data.entryCredits ?? null,
      raceDuration: parsed.data.raceDuration ?? 60,
      createdById: session.user.discordId,
    },
  });

  sendEventNotification(event).catch((err) =>
    console.error("[webhook] Failed to send Discord notification:", err)
  );

  return NextResponse.json(enrichEvent(event), { status: 201 });
}
