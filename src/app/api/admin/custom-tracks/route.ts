import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { LMU_TRACKS } from "@/lib/tracks";

export async function GET() {
  const rows = await prisma.customTrack.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(rows.map((r) => r.name));
}

const addSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const name = parsed.data.name;
  const staticTracks = LMU_TRACKS.flatMap((g) => g.options);
  if (staticTracks.some((t) => t.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "Ce circuit existe déjà dans la liste" }, { status: 409 });
  }

  const existingRows = await prisma.customTrack.findMany({ select: { name: true } });
  if (existingRows.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "Ce circuit a déjà été ajouté" }, { status: 409 });
  }

  const row = await prisma.customTrack.create({ data: { name } });
  return NextResponse.json(row, { status: 201 });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  await prisma.customTrack.deleteMany({ where: { name: parsed.data.name } });
  return NextResponse.json({ ok: true });
}
