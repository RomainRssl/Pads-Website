import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

interface CarClass {
  name: string;
  max_places: number | null;
}

function parseCars(raw: string): CarClass[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      if (typeof item === "string") return { name: item, max_places: null };
      if (typeof item === "object" && item !== null) {
        return {
          name: String(item.name ?? ""),
          max_places: item.max_places ?? item.maxCars ?? null,
        };
      }
      return { name: String(item), max_places: null };
    });
  } catch {
    return [];
  }
}

function enrichEvent(event: { cars: string; [key: string]: unknown }) {
  return {
    ...event,
    classes_with_limits: parseCars(event.cars),
  };
}

const carEntrySchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    max_places: z.number().int().min(1).nullable().optional(),
    maxCars: z.number().int().min(1).nullable().optional(),
  }),
]);

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  date: z.string().datetime().optional(),
  game: z.string().min(1).max(100).optional(),
  track: z.string().min(1).max(100).optional(),
  cars: z.array(carEntrySchema).min(1).max(5).optional(),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  serverName: z.string().max(100).optional().nullable(),
  serverPassword: z.string().max(100).optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(enrichEvent(event));
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = updateEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.date) data.date = new Date(parsed.data.date);
  if (parsed.data.imageUrl === "") data.imageUrl = null;

  // Normalize cars to { name, max_places } if provided
  if (parsed.data.cars) {
    const normalized: CarClass[] = parsed.data.cars.map((c) => {
      if (typeof c === "string") return { name: c, max_places: null };
      return {
        name: c.name,
        max_places: c.max_places ?? c.maxCars ?? null,
      };
    });
    data.cars = JSON.stringify(normalized);
  }

  const event = await prisma.event.update({ where: { id }, data });
  return NextResponse.json(enrichEvent(event));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.event.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
