import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { parseFile, classifyIncidentBreakdown } from "@/lib/race-parser";
import { calculateAll, parseFormulaFromForm } from "@/lib/rewards";
import { prisma } from "@/lib/prisma";
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

    // Fetch current ladder points per player/class (for ladder tier calculation)
    // Build perEntryLadderPointsMap: username (lowercase) → ladderPoints for this car class
    const classStats = await prisma.playerClassStats.findMany({
      include: { player: { select: { username: true } } },
    });
    const ladderPointsLookup = new Map<string, number>(); // "username::carClass" → ladderPoints
    for (const stat of classStats) {
      ladderPointsLookup.set(
        `${stat.player.username.toLowerCase()}::${stat.carClass}`,
        stat.ladderPoints
      );
    }

    // Build ladder rank lookup: "username::carClass" → rank (position in class standings)
    // Group all stats by carClass, sort by ladderPoints desc, assign rank
    const ladderRankLookup = new Map<string, number>(); // "username::carClass" → rank
    const statsByClass = new Map<string, typeof classStats>();
    for (const stat of classStats) {
      if (!statsByClass.has(stat.carClass)) statsByClass.set(stat.carClass, []);
      statsByClass.get(stat.carClass)!.push(stat);
    }
    for (const [, group] of Array.from(statsByClass.entries())) {
      const sorted = [...group].sort((a, b) => b.ladderPoints - a.ladderPoints);
      sorted.forEach((stat, i) => {
        ladderRankLookup.set(
          `${stat.player.username.toLowerCase()}::${stat.carClass}`,
          i + 1
        );
      });
    }

    const perEntryLadderPointsMap = new Map<string, number>();
    for (const e of extendedEntries) {
      if (e.carClass) {
        const key = `${e.username.toLowerCase()}::${e.carClass}`;
        perEntryLadderPointsMap.set(e.username.toLowerCase(), ladderPointsLookup.get(key) ?? 0);
      }
    }

    const calculated = calculateAll(extendedEntries, durationMin, formula, perEntryLadderPointsMap);

    // Classify XML incident breakdown using formula thresholds
    const incidentCounts = parsed.incidentBreakdown
      ? classifyIncidentBreakdown(parsed.incidentBreakdown, {
          avertRatioMin:    formula.avertRatioMin,
          sanctionRatioMin: formula.sanctionRatioMin,
          forceThreshold:   formula.forceThreshold,
          forceRatioMin:    formula.forceRatioMin,
        })
      : undefined;

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
      ladderRank:     parsed.extended[idx]?.carClass
        ? (ladderRankLookup.get(`${entry.username.toLowerCase()}::${parsed.extended[idx].carClass}`) ?? null)
        : null,
    }));

    return NextResponse.json({
      preview,
      durationMin,
      durationAutoDetected,
      meta: parsed.meta,
      formula,
      incidentCounts,
    });
  } catch (err) {
    console.error("[preview] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
