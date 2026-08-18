import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ENDURANCE_CAR_CLASSES } from "@/lib/endurance";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateEnduranceSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  track: z.string().min(1).max(150).optional(),
  carClasses: z.array(z.enum(ENDURANCE_CAR_CLASSES)).min(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const endurance = await prisma.endurance.findUnique({ where: { id } });
  if (!endurance) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(endurance);
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
  const parsed = updateEnduranceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.title) data.title = parsed.data.title;
  if (parsed.data.track) data.track = parsed.data.track;
  if (parsed.data.carClasses) data.carClasses = JSON.stringify(parsed.data.carClasses);
  if (parsed.data.startDate) data.startDate = new Date(parsed.data.startDate);
  if (parsed.data.endDate) data.endDate = new Date(parsed.data.endDate);

  const endurance = await prisma.endurance.update({ where: { id }, data });
  return NextResponse.json(endurance);
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
  await prisma.endurance.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
