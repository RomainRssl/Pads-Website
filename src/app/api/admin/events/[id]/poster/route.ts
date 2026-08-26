import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generatePoster } from "@/lib/poster-pipeline";
import { NextResponse } from "next/server";
import { z } from "zod";

// ── État de l'affiche d'une course ────────────────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      posterStatus: true,
      posterError: true,
      posterPath: true,
      scenePath: true,
      posterAt: true,
    },
  });
  if (!event) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(event);
}

// ── Générer / régénérer l'affiche ─────────────────────────────────────────────

const generateSchema = z.object({
  // force = régénérer aussi le visuel Gemini quand il existe déjà
  force: z.boolean().optional().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) {
    return NextResponse.json({ error: "Course introuvable." }, { status: 404 });
  }

  const resultat = await generatePoster(id, { forceScene: parsed.data.force });
  const rafraichi = await prisma.event.findUnique({
    where: { id },
    select: {
      posterStatus: true,
      posterError: true,
      posterPath: true,
      scenePath: true,
      posterAt: true,
    },
  });

  const status =
    resultat.statut === "READY" ? 200 :
    resultat.statut === "QUEUED" ? 202 : 500;

  return NextResponse.json({ ...resultat, ...rafraichi }, { status });
}
