// ── Service partagé d'ingestion de résultats (app desktop) ────────────────────
//
// Ce module NE recalcule PAS l'ELO : il s'appuie sur `calculateAll` de
// `@/lib/rewards` (source de vérité unique, identique à la page d'ajout de
// course). Il fournit :
//   1. la résolution nom LMU → Player (normalisation),
//   2. la persistance DB des résultats calculés (RaceSession / RaceResult /
//      Player / PlayerClassStats / RaceHistory) — mêmes colonnes que la route
//      admin existante,
//   3. la lecture du classement (mirroir de /classement & /api/players/ladder).

import { prisma } from "./prisma";
import { getClassXpTier, tiersFromDb } from "./class-tiers";
import type { CalculatedEntry } from "./rewards";

// ── Résolution de nom LMU ─────────────────────────────────────────────────────

/**
 * Normalise un pseudo LMU pour le matching :
 *  - minuscules
 *  - accents retirés
 *  - suffixe `#1234` retiré
 *  - espaces multiples réduits, trim
 */
export function normalizeLmuName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/#\d+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Persistance (mode Carrière, sans constructor/track-records faute de data) ──

export interface IngestEntry {
  player: { id: string; username: string; reputation: number; teamId: string | null };
  /** Résultat calculé par calculateAll (xpGained, moneyGained, reputationDelta, ladderDelta, carClass, position, isClean, incidents). */
  calc: CalculatedEntry;
  carNumber: string | null;
  laps: number | null;
  bestLapTimeSec: number | null;
  finishStatus: string | null;
  teamName: string | null;
  offtrackCount: number | null;
  contactCount: number | null;
  avertCount: number | null;
  sanctionCount: number | null;
}

export interface PersistOptions {
  entries: IngestEntry[];
  durationMin: number;
  processedBy: string;
  eventId: string | null;
  title: string;
  track: string;
  date: Date;
  sessionType: string | null;
  /** ladderPoints actuel par clé `username.toLowerCase()::carClass` (avant course). */
  ladderPointsLookup: Map<string, number>;
  /** classXp actuel par clé `username.toLowerCase()::carClass` (avant course). */
  classXpLookup: Map<string, number>;
  warningThreshold?: number;
  sanctionThreshold?: number;
}

export interface PersistResult {
  raceSessionId: string;
  raceHistoryId: string;
  updatedPlayers: number;
}

/**
 * Écrit les résultats calculés en base — reproduit fidèlement la branche
 * « Carrière » de src/app/api/admin/results/process/route.ts (mêmes champs,
 * même clamp réputation, même upsert PlayerClassStats), sans la modifier.
 */
export async function persistDesktopResults(opts: PersistOptions): Promise<PersistResult> {
  const {
    entries,
    durationMin,
    processedBy,
    eventId,
    title,
    track,
    date,
    sessionType,
    ladderPointsLookup,
    classXpLookup,
    warningThreshold = 4,
    sanctionThreshold = 8,
  } = opts;

  const rawResultsJson = JSON.stringify(
    entries
      .slice()
      .sort((a, b) => a.calc.position - b.calc.position)
      .map((e) => ({
        position: e.calc.position,
        username: e.player.username,
        carClass: e.calc.carClass,
        carNumber: e.carNumber,
        teamName: e.teamName,
        laps: e.laps,
        bestLapTime: e.bestLapTimeSec,
        incidents: e.calc.incidents,
        finishStatus: e.finishStatus,
        constructor: undefined,
        isClean: e.calc.isClean,
        offtrackCount: e.offtrackCount,
        contactCount: e.contactCount,
        avertCount: e.avertCount,
        sanctionCount: e.sanctionCount,
      }))
  );

  return prisma.$transaction(async (tx) => {
    const raceSession = await tx.raceSession.create({
      data: {
        durationMin,
        processedBy,
        trackVenue: track,
        trackEvent: null,
        sessionType,
        warningThreshold,
        sanctionThreshold,
      },
    });

    for (const entry of entries) {
      const { player, calc } = entry;
      const currentRep = player.reputation ?? 50;
      const newRep = Math.min(200, Math.max(0, currentRep + calc.reputationDelta));

      await tx.player.update({
        where: { id: player.id },
        data: {
          xp: { increment: calc.xpGained },
          money: { increment: calc.moneyGained },
          finishedRaces: { increment: 1 },
          totalRaces: { increment: 1 },
          ...(calc.isClean ? { cleanRaces: { increment: 1 } } : {}),
          reputation: newRep,
        },
      });

      await tx.raceResult.create({
        data: {
          playerId: player.id,
          raceSessionId: raceSession.id,
          position: calc.position,
          xpGained: calc.xpGained,
          moneyGained: calc.moneyGained,
          isClean: calc.isClean,
          carClass: calc.carClass ?? null,
          incidents: calc.incidents,
          reputationDelta: calc.reputationDelta,
          ladderDelta: calc.ladderDelta,
          laps: entry.laps,
          bestLapTimeSec: entry.bestLapTimeSec,
          finishStatus: entry.finishStatus,
          teamName: entry.teamName,
          offtrackCount: entry.offtrackCount,
          contactCount: entry.contactCount,
          avertCount: entry.avertCount,
          sanctionCount: entry.sanctionCount,
        },
      });

      if (calc.carClass) {
        const statKey = `${player.username.toLowerCase()}::${calc.carClass}`;
        const currentClassXp = classXpLookup.get(statKey) ?? 0;
        const currentLadderPoints = ladderPointsLookup.get(statKey) ?? 0;
        const newLadderPoints = Math.max(0, currentLadderPoints + calc.ladderDelta);

        await tx.playerClassStats.upsert({
          where: { playerId_carClass: { playerId: player.id, carClass: calc.carClass } },
          update: {
            classXp: { increment: calc.xpGained },
            ladderPoints: newLadderPoints,
          },
          create: {
            playerId: player.id,
            carClass: calc.carClass,
            classXp: currentClassXp + calc.xpGained,
            ladderPoints: Math.max(0, calc.ladderDelta),
          },
        });
      }

      if (player.teamId) {
        await tx.team.update({
          where: { id: player.teamId },
          data: { xp: { increment: calc.xpGained } },
        });
      }
    }

    const raceHistory = await tx.raceHistory.create({
      data: {
        ...(eventId ? { event: { connect: { id: eventId } } } : {}),
        title,
        date,
        track,
        rawResults: rawResultsJson,
        createdBy: processedBy,
      },
    });

    return {
      raceSessionId: raceSession.id,
      raceHistoryId: raceHistory.id,
      updatedPlayers: entries.length,
    };
  });
}

// ── Classement (lecture) ──────────────────────────────────────────────────────

export interface StandingRow {
  rang: number;
  playerId: string;
  username: string;
  discordId: string | null;
  ladderPoints: number;
  classXp: number;
  palier: string; // tier XP de classe (Bronze…Diamant) — même sémantique que /classement
}

/**
 * Classement par classe (rang sur ladderPoints desc, palier = tier XP de classe).
 * Mirroir de /classement & /api/players/ladder — une seule sémantique de rang.
 * @param carClasses si fourni, restreint aux classes listées (sinon toutes).
 */
export async function getClassStandings(
  carClasses?: string[]
): Promise<Map<string, StandingRow[]>> {
  const licenseConfigs = await prisma.licenseConfig.findMany({ orderBy: { order: "asc" } });
  const classXpTiers = tiersFromDb(licenseConfigs);

  const stats = await prisma.playerClassStats.findMany({
    where: carClasses && carClasses.length ? { carClass: { in: carClasses } } : undefined,
    orderBy: [{ carClass: "asc" }, { ladderPoints: "desc" }],
    include: { player: { select: { id: true, username: true, discordId: true } } },
  });

  const byClass = new Map<string, StandingRow[]>();
  for (const s of stats) {
    if (!byClass.has(s.carClass)) byClass.set(s.carClass, []);
    const rows = byClass.get(s.carClass)!;
    rows.push({
      rang: rows.length + 1, // déjà trié par ladderPoints desc
      playerId: s.player.id,
      username: s.player.username,
      discordId: s.player.discordId,
      ladderPoints: s.ladderPoints,
      classXp: s.classXp,
      palier: getClassXpTier(s.classXp, classXpTiers).name,
    });
  }
  return byClass;
}
