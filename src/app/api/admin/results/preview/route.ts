import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { parseFile } from "@/lib/race-parser";
import { calculateAll, parseFormulaFromForm } from "@/lib/rewards";
import { prisma } from "@/lib/prisma";
import { getClassXpTier, tiersFromDb } from "@/lib/class-tiers";
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

    // Fetch XP tiers from DB (same as /classement page)
    const licenseConfigs = await prisma.licenseConfig.findMany({ orderBy: { order: "asc" } });
    const classXpTiers = tiersFromDb(licenseConfigs);

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

    // Build classXpTier lookup: "username::carClass" → tier name + color
    const classXpTierLookup = new Map<string, { name: string; color: string }>();
    for (const stat of classStats) {
      const tier = getClassXpTier(stat.classXp, classXpTiers);
      classXpTierLookup.set(
        `${stat.player.username.toLowerCase()}::${stat.carClass}`,
        { name: tier.name, color: tier.color }
      );
    }

    const perEntryLadderPointsMap = new Map<string, number>();
    for (const e of extendedEntries) {
      if (e.carClass) {
        const key = `${e.username.toLowerCase()}::${e.carClass}`;
        perEntryLadderPointsMap.set(e.username.toLowerCase(), ladderPointsLookup.get(key) ?? 0);
      }
    }

    const calculated = calculateAll(extendedEntries, durationMin, formula, perEntryLadderPointsMap);

    // Build detailed contacts log from raw incident breakdown
    type ContactLogEntry = {
      type: "player" | "immovable" | "offtrack";
      etSec: number;
      driver: string;
      opponent?: string;
      forceDriver?: number;
      forceOpponent?: number;
      classificationDriver?: "avert" | "sanction" | "none";
      classificationOpponent?: "avert" | "sanction" | "none";
      force?: number;
    };

    let contactsLog: ContactLogEntry[] = [];
    let incidentCounts: Record<string, { offtrack: number; contact: number; avert: number; sanction: number }> | undefined;

    if (parsed.incidentBreakdown) {
      const seenPairs = new Set<string>();
      const breakdown = parsed.incidentBreakdown;

      for (const [driver, data] of Object.entries(breakdown)) {
        // Offtrack events
        for (const etSec of data.offtrackTimes) {
          contactsLog.push({ type: "offtrack", etSec, driver });
        }

        // Immovable events
        for (const ev of data.immovableEvents) {
          contactsLog.push({ type: "immovable", etSec: ev.etSec, driver, force: ev.force });
        }

        // Player contacts — affichés UNIQUEMENT si la force max dépasse le
        // seuil. Plus de classement auto (avert/sanction manuel). Dédup paires.
        for (const c of data.playerContacts) {
          const maxForce = Math.max(c.myForce, c.opponentForce);
          if (maxForce <= formula.forceThreshold) continue; // sous le seuil → masqué
          const key = [driver, c.opponent].sort().join("::") + `::${c.etSec}`;
          if (seenPairs.has(key)) continue;
          seenPairs.add(key);

          contactsLog.push({
            type: "player",
            etSec: c.etSec,
            driver,
            opponent: c.opponent,
            forceDriver: c.myForce,
            forceOpponent: c.opponentForce,
            classificationDriver: "none",
            classificationOpponent: "none",
          });
        }
      }

      contactsLog.sort((a, b) => a.etSec - b.etSec);

      // Derive incidentCounts from contactsLog — guarantees the table matches the panel exactly
      incidentCounts = {};
      const ensure = (name: string) => {
        if (!incidentCounts![name]) incidentCounts![name] = { offtrack: 0, contact: 0, avert: 0, sanction: 0 };
        return incidentCounts![name];
      };

      for (const [driver, data] of Object.entries(breakdown)) {
        ensure(driver).offtrack = data.offtrackWarnings;
        ensure(driver).contact  = data.immovableContacts;
      }

      for (const entry of contactsLog) {
        if (entry.type !== "player") continue;
        if (entry.classificationDriver === "avert")         ensure(entry.driver).avert++;
        else if (entry.classificationDriver === "sanction") ensure(entry.driver).sanction++;
        if (entry.opponent) {
          if (entry.classificationOpponent === "avert")         ensure(entry.opponent).avert++;
          else if (entry.classificationOpponent === "sanction") ensure(entry.opponent).sanction++;
        }
      }
    }

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
      classXpTier:    parsed.extended[idx]?.carClass
        ? (classXpTierLookup.get(`${entry.username.toLowerCase()}::${parsed.extended[idx].carClass}`) ?? null)
        : null,
    }));

    return NextResponse.json({
      preview,
      durationMin,
      durationAutoDetected,
      meta: parsed.meta,
      formula,
      incidentCounts,
      contactsLog,
    });
  } catch (err) {
    console.error("[preview] Unhandled error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
