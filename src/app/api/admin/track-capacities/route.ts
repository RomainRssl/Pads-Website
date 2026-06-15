import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const rows = await prisma.trackCapacity.findMany();
  // Return as { [track]: capacity }
  const map: Record<string, number> = {};
  for (const r of rows) map[r.track] = r.capacity;
  return NextResponse.json(map);
}

const saveSchema = z.object({
  track: z.string().min(1),
  capacity: z.number().int().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const row = await prisma.trackCapacity.upsert({
    where: { track: parsed.data.track },
    update: { capacity: parsed.data.capacity },
    create: { track: parsed.data.track, capacity: parsed.data.capacity },
  });

  return NextResponse.json(row);
}
