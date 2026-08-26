import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LMU_TRACKS } from "@/lib/tracks";
import { NextResponse } from "next/server";
import { z } from "zod";

// ── Fiches circuit (affiches FIS) ─────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [tracks, eventTracks] = await Promise.all([
    prisma.track.findMany({ orderBy: { track: "asc" } }),
    prisma.event.findMany({ distinct: ["track"], select: { track: true } }),
  ]);

  // Aide à la saisie : liste officielle + valeurs réellement utilisées en base.
  const knownTracks = [
    ...new Set([
      ...LMU_TRACKS.flatMap((g) => g.options),
      ...eventTracks.map((e) => e.track),
    ]),
  ].sort();

  return NextResponse.json({ tracks, knownTracks });
}

const trackSchema = z.object({
  track: z.string().min(1).max(200),
  officialName: z.string().min(1).max(200),
  displayName: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  countryCode: z.string().min(2).max(2),
  location: z.string().min(1).max(200),
});

// Création ou édition : la clé est le nom exact du circuit (Event.track).
export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { track, ...data } = parsed.data;
  const saved = await prisma.track.upsert({
    where: { track },
    update: data,
    create: { track, ...data },
  });

  return NextResponse.json(saved);
}
