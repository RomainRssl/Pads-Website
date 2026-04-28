import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateEventSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  date: z.string().datetime().optional(),
  game: z.string().min(1).max(60).optional(),
  track: z.string().min(1).max(60).optional(),
  car: z.string().min(1).max(60).optional(),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
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
  return NextResponse.json(event);
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

  const event = await prisma.event.update({ where: { id }, data });
  return NextResponse.json(event);
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
