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

  let text: string;
  try {
    text = await file.text();
  } catch {
    return NextResponse.json({ error: "Impossible de lire le fichier." }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseFile(file.name, text);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur de parsing." },
      { status: 400 }
    );
  }

  // Duration: use provided value or auto-detect from XML metadata
  let durationMin = durationRaw ? parseInt(durationRaw, 10) : NaN;
  const durationAutoDetected = isNaN(durationMin) || durationMin <= 0;

  if (durationAutoDetected) {
    if (parsed.meta.raceTimeMin && parsed.meta.raceTimeMin > 0) {
      durationMin = parsed.meta.raceTimeMin;
    } else {
      return NextResponse.json(
        { error: "Durée manquante. Saisissez-la manuellement ou utilisez un fichier XML LMU." },
        { status: 400 }
      );
    }
  }

  if (parsed.entries.length === 0) {
    return NextResponse.json({ error: "Le fichier ne contient aucune entrée." }, { status: 400 });
  }

  const calculated = calculateAll(parsed.entries, durationMin);

  // Look up players case-insensitively
  const lowerUsernames = calculated.map((e) => e.username.toLowerCase());
  const players = await prisma.player.findMany({
    select: { id: true, username: true },
  });
  const foundSet = new Set(
    players
      .filter((p) => lowerUsernames.includes(p.username.toLowerCase()))
      .map((p) => p.username.toLowerCase())
  );

  // Merge calculated rewards + extended XML data
  const preview = calculated.map((entry, idx) => ({
    ...entry,
    foundInDb: foundSet.has(entry.username.toLowerCase()),
    // Extended fields (present for XML, undefined for JSON/CSV)
    carClass: parsed.extended[idx]?.carClass,
    carNumber: parsed.extended[idx]?.carNumber,
    teamName: parsed.extended[idx]?.teamName,
    laps: parsed.extended[idx]?.laps,
    bestLapTimeSec: parsed.extended[idx]?.bestLapTimeSec,
    finishStatus: parsed.extended[idx]?.finishStatus,
  }));

  return NextResponse.json({
    preview,
    durationMin,
    durationAutoDetected,
    meta: parsed.meta,
  });
}
