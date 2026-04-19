import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { parseFile } from "@/lib/race-parser";
import { calculateAll } from "@/lib/rewards";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const durationRaw = formData.get("duration") as string | null;

  if (!file) return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
  if (!durationRaw) return NextResponse.json({ error: "Durée manquante." }, { status: 400 });

  const durationMin = parseInt(durationRaw, 10);
  if (isNaN(durationMin) || durationMin <= 0) {
    return NextResponse.json({ error: "Durée invalide." }, { status: 400 });
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return NextResponse.json({ error: "Impossible de lire le fichier." }, { status: 400 });
  }

  let entries;
  try {
    entries = parseFile(file.name, text);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur de parsing." },
      { status: 400 }
    );
  }

  if (entries.length === 0) {
    return NextResponse.json({ error: "Le fichier ne contient aucune entrée." }, { status: 400 });
  }

  const calculated = calculateAll(entries, durationMin);

  // Look up players in DB — fetch candidates then compare case-insensitively in JS
  const lowerUsernames = calculated.map((e) => e.username.toLowerCase());
  const players = await prisma.player.findMany({
    select: { id: true, username: true },
  });
  const foundSet = new Set(
    players
      .filter((p) => lowerUsernames.includes(p.username.toLowerCase()))
      .map((p) => p.username.toLowerCase())
  );

  const preview = calculated.map((entry) => ({
    ...entry,
    foundInDb: foundSet.has(entry.username.toLowerCase()),
  }));

  return NextResponse.json({ preview, durationMin });
}
