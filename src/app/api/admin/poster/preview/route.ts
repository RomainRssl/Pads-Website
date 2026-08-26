import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generatePosterPreview } from "@/lib/poster-pipeline";
import { NextResponse } from "next/server";
import { z } from "zod";

// Prévisualisation d'une affiche depuis le formulaire de création, avant que
// la course n'existe. Renvoie un jeton de brouillon à repasser à POST
// /api/events pour rattacher l'affiche validée à la course.

const carEntrySchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    max_places: z.number().int().min(1).nullable().optional(),
    maxCars: z.number().int().min(1).nullable().optional(),
  }),
]);

const previewSchema = z.object({
  track: z.string().min(1).max(200),
  date: z.string().datetime(),
  cars: z.array(carEntrySchema).min(1).max(5),
  weekNumber: z.number().int().min(1).max(53).nullable().optional(),
  entryCredits: z.number().int().min(0).nullable().optional(),
  raceDuration: z.number().int().min(1).nullable().optional(),
  posterAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  // Identité du circuit saisie depuis le formulaire de course : enregistrée
  // au passage, pour que les courses suivantes sur ce circuit la retrouvent.
  trackSheet: z
    .object({
      officialName: z.string().min(1).max(200),
      displayName: z.string().min(1).max(100),
      country: z.string().min(1).max(100),
      countryCode: z.string().length(2),
      location: z.string().min(1).max(200),
    })
    .optional(),
  // Visuel fourni par l'admin (data URI ou base64 nu) : aucune génération.
  sceneImage: z.string().max(14_000_000).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const d = parsed.data;
  const names = d.cars.map((c) => (typeof c === "string" ? c : c.name));

  // La fiche circuit est créée ou mise à jour depuis le formulaire de course :
  // pas besoin de passer par l'écran d'administration des circuits.
  if (d.trackSheet) {
    const sheet = {
      ...d.trackSheet,
      countryCode: d.trackSheet.countryCode.toLowerCase(),
    };
    await prisma.track.upsert({
      where: { track: d.track },
      update: sheet,
      create: { track: d.track, ...sheet },
    });
  }

  const sceneFournie = d.sceneImage
    ? Buffer.from(d.sceneImage.replace(/^data:[^;]+;base64,/, ""), "base64")
    : undefined;

  const resultat = await generatePosterPreview(
    {
      date: new Date(d.date),
      cars: JSON.stringify(names),
      weekNumber: d.weekNumber ?? null,
      posterAccent: d.posterAccent ?? "#F07000",
      entryCredits: d.entryCredits ?? null,
      raceDuration: d.raceDuration ?? 60,
      practiceMinutes: 10,
      qualiMinutes: 10,
    },
    d.track,
    sceneFournie
  );

  const status =
    resultat.statut === "READY" ? 200 :
    resultat.statut === "QUEUED" ? 202 : 400;

  return NextResponse.json(resultat, { status });
}
