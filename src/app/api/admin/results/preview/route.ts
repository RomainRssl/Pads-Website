import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { parseFile } from "@/lib/race-parser";
import { calculateAll, parseFormulaFromForm } from "@/lib/rewards";
import { prisma } from "@/lib/prisma";
import { tiersFromDb } from "@/lib/class-tiers";
import type { ExtendedRawEntry } from "@/lib/rewards";

export async function POST(req: Request) {
  try {
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

    // Duration: provided value OR auto-detect from XML metadata
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

    // Read formula from form data
    const formula = parseFormulaFromForm(formData);

    // Build extended entries (RawEntry + carClass + finishStatus)
    const extendedEntries: ExtendedRawEntry[] = parsed.entries.map((e, idx) => ({
      ...e,
      carClass:     parsed.extended[idx]?.carClass,
      finishStatus: parsed.extended[idx]?.finishStatus,
    }));

    // Fetch XP tiers from DB (admin-configurable)
    const licenseConfigs = await prisma.licenseConfig.findMany({ orderBy: { order: "asc" } });
    const classXpTiers = tiersFromDb(licenseConfigs);

    // Look up players case-insensitively
    const lowerUsernames = parsed.entries.map((e) => e.username.toLowerCase());
    const allPlayers = await prisma.player.findMany({
      select: { id: true, username: true },
    });
    const foundSet = new Set(
      allPlayers
        .filter((p) => lowerUsernames.includes(p.username.toLowerCase()))
        .map((p) => p.username.toLowerCase())
    );

    // Fetch current class XP per player (for ladder tier calculation)
    // Build perEntryClassXpMap: username (lowercase) → classXp for this car class
    const classStats = await prisma.playerClassStats.findMany({
      include: { player: { select: { username: true } } },
    });
    const classXpLookup = new Map<string, number>(); // "username::carClass" → classXp
    for (const stat of classStats) {
      classXpLookup.set(
        `${stat.player.username.toLowerCase()}::${stat.carClass}`,
        stat.classXp
      );
    }

    const perEntryClassXpMap = new Map<string, number>();
    for (const e of extendedEntries) {
      if (e.carClass) {
        const key = `${e.username.toLowerCase()}::${e.carClass}`;
        perEntryClassXpMap.set(e.username.toLowerCase(), classXpLookup.get(key) ?? 0);
      }
    }

    const calculated = calculateAll(extendedEntries, durationMin, formula, perEntryClassXpMap, classXpTiers);

    const preview = calculated.map((entry, idx) => ({
      ...entry,
      foundInDb:      foundSet.has(entry.username.toLowerCase()),
      willBeCreated:  !foundSet.has(entry.username.toLowerCase()),
      carClass:       parsed.extended[idx]?.carClass,
      carNumber:      parsed.extended[idx]?.carNumber,
      teamName:       parsed.extended[idx]?.teamName,
      laps:           parsed.extended[idx]?.laps,
      bestLapTimeSec: parsed.extended[idx]?.bestLapTimeSec,
      finishStatus:   parsed.extended[idx]?.finishStatus,
    }));

    return NextResponse.json({
      preview,
      durationMin,
      durationAutoDetected,
      meta: parsed.meta,
      formula,
    });
  } catch (err) {
    console.error("[preview] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
