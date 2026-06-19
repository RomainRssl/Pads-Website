// ── POST /api/results/ingest ──────────────────────────────────────────────────
// Reçoit un résultat débriefé par l'app desktop (LMU Steward PADS) :
// positions + sanctions manuelles + contacts analysés.
// Protégé par bearer DESKTOP_API_SECRET.
//
// L'ELO/ladder et la réputation sont calculés par calculateAll (@/lib/rewards),
// EXACTEMENT comme la page admin d'ajout de course — aucune réimplémentation.
// La persistance passe par persistDesktopResults (@/lib/race-ingest).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDesktopAuthorized } from "@/lib/desktop-auth";
import { calculateAll, DEFAULT_FORMULA } from "@/lib/rewards";
import type { ExtendedRawEntry } from "@/lib/rewards";
import {
  normalizeLmuName,
  persistDesktopResults,
  getClassStandings,
  type IngestEntry,
} from "@/lib/race-ingest";

// ── Types d'entrée (contrat figé — voir PADS_DESKTOP_API.md) ──────────────────

interface InDriver {
  name: string;
  carNumber?: string;
  carClass?: string;
  finishPosition: number;
  gridPos?: number;
  bestLapTime?: number; // secondes
  laps?: number;
  finishStatus?: string;
  // Compteurs d'incidents par pilote (édités dans l'aperçu desktop). Si fournis,
  // ils priment sur la dérivation contacts/sanctions — l'aperçu == l'enregistré.
  offtrackCount?: number;
  contactCount?: number;
  avertCount?: number;
  sanctionCount?: number;
}
interface InSanction {
  driverName?: string;
  carNumber?: string;
  type?: string; // TIME_PENALTY | DSQ | WARNING | …
  seconds?: number;
  reason?: string;
  et?: number;
}
interface InContactSide {
  name?: string;
  carNumber?: string;
}
interface InContact {
  et?: number;
  driverA?: InContactSide;
  driverB?: InContactSide;
  forceA?: number;
  forceB?: number;
  ratio?: number;
  verdict?: string; // SANCTION | WARNING | RACING_INCIDENT | IGNORED | WALL_OR_SOLO | REVIEW
  atFault?: InContactSide;
}
interface InBody {
  source?: string;
  track?: string;
  sessionType?: string;
  dateTime?: number | string;
  durationMin?: number;
  eventId?: string;
  drivers?: InDriver[];
  sanctions?: InSanction[];
  contacts?: InContact[];
}

// Normalisation classe → valeurs CAR_CLASSES (cf. race-parser.normalizeCarClass)
function normalizeCarClass(raw?: string): string | undefined {
  if (!raw) return undefined;
  const map: Record<string, string> = {
    HYPER: "HYPERCAR",
    HYPERCAR: "HYPERCAR",
    GT3: "LMGT3",
    LMGT3: "LMGT3",
    GTE: "GTE",
    LMP2: "LMP2",
    LMP2_ELMS: "LMP2",
    LMP3: "LMP3",
  };
  return map[raw.toUpperCase()] ?? raw;
}

type Counts = { offtrack: number; contact: number; avert: number; sanction: number };

export async function POST(req: Request) {
  if (!isDesktopAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: InBody;
  try {
    body = (await req.json()) as InBody;
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  const drivers = Array.isArray(body.drivers) ? body.drivers : [];
  if (drivers.length === 0) {
    return NextResponse.json({ error: "Aucun pilote (drivers) fourni." }, { status: 400 });
  }

  const durationMin = Number(body.durationMin);
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return NextResponse.json(
      { error: "durationMin (minutes) requis et > 0." },
      { status: 400 }
    );
  }

  // ── Résolution nom LMU → Player ─────────────────────────────────────────────
  const allPlayers = await prisma.player.findMany({
    select: { id: true, username: true, reputation: true, teamId: true },
  });
  const byNormName = new Map<string, (typeof allPlayers)[number]>();
  for (const p of allPlayers) byNormName.set(normalizeLmuName(p.username), p);

  // Helpers de matching d'un côté de sanction/contact vers un driver d'entrée
  const driverKey = (d: { carNumber?: string; name?: string }) =>
    d.carNumber != null && d.carNumber !== ""
      ? `n:${String(d.carNumber)}`
      : `name:${normalizeLmuName(d.name ?? "")}`;

  // Compteurs d'incidents par driver (clé = driverKey du driver d'entrée)
  const counts = new Map<string, Counts>();
  const ensure = (key: string): Counts => {
    if (!counts.has(key)) counts.set(key, { offtrack: 0, contact: 0, avert: 0, sanction: 0 });
    return counts.get(key)!;
  };

  for (const s of body.sanctions ?? []) {
    const key = driverKey({ carNumber: s.carNumber, name: s.driverName });
    const c = ensure(key);
    if ((s.type ?? "").toUpperCase() === "WARNING") c.avert++;
    else c.sanction++;
  }
  for (const ct of body.contacts ?? []) {
    const verdict = (ct.verdict ?? "").toUpperCase();
    if (verdict === "SANCTION" || verdict === "WARNING") {
      const at = ct.atFault ?? ct.driverA;
      if (at) {
        const c = ensure(driverKey(at));
        if (verdict === "SANCTION") c.sanction++;
        else c.avert++;
      }
    } else if (verdict === "WALL_OR_SOLO") {
      const at = ct.atFault ?? ct.driverA;
      if (at) ensure(driverKey(at)).contact++;
    }
    // RACING_INCIDENT / IGNORED / REVIEW → aucun compteur
  }

  // ── Construction des entrées résolues ───────────────────────────────────────
  const resolved: { name: string; carNumber: string | null; playerId: string; username: string }[] = [];
  const unresolved: { name: string; carNumber: string | null }[] = [];

  const extendedEntries: ExtendedRawEntry[] = [];
  // username.toLowerCase() → infos de persistance (player + champs RaceResult)
  const persistMeta = new Map<
    string,
    {
      player: (typeof allPlayers)[number];
      carNumber: string | null;
      laps: number | null;
      bestLapTimeSec: number | null;
      finishStatus: string | null;
      counts: Counts;
    }
  >();

  for (const d of drivers) {
    const player = byNormName.get(normalizeLmuName(d.name ?? ""));
    const carNumber = d.carNumber != null && d.carNumber !== "" ? String(d.carNumber) : null;
    if (!player) {
      unresolved.push({ name: d.name, carNumber });
      continue;
    }

    const hasExplicitCounts =
      d.offtrackCount != null ||
      d.contactCount != null ||
      d.avertCount != null ||
      d.sanctionCount != null;
    const c = hasExplicitCounts
      ? {
          offtrack: Number(d.offtrackCount) || 0,
          contact: Number(d.contactCount) || 0,
          avert: Number(d.avertCount) || 0,
          sanction: Number(d.sanctionCount) || 0,
        }
      : counts.get(driverKey({ carNumber: d.carNumber, name: d.name })) ?? {
          offtrack: 0,
          contact: 0,
          avert: 0,
          sanction: 0,
        };
    const incidents = c.offtrack + c.contact + c.avert + c.sanction;
    const isClean = c.contact + c.avert + c.sanction === 0;

    extendedEntries.push({
      username: player.username, // pseudo LMU stocké → matching/persist cohérent
      position: d.finishPosition,
      isClean,
      incidents,
      carClass: normalizeCarClass(d.carClass),
      finishStatus: d.finishStatus,
      offtrackCount: c.offtrack,
      contactCount: c.contact,
      avertCount: c.avert,
      sanctionCount: c.sanction,
    });

    persistMeta.set(player.username.toLowerCase(), {
      player,
      carNumber,
      laps: typeof d.laps === "number" ? d.laps : null,
      bestLapTimeSec: typeof d.bestLapTime === "number" && d.bestLapTime > 0 ? d.bestLapTime : null,
      finishStatus: d.finishStatus ?? null,
      counts: c,
    });

    resolved.push({ name: d.name, carNumber, playerId: player.id, username: player.username });
  }

  if (extendedEntries.length === 0) {
    return NextResponse.json(
      { error: "Aucun pilote résolu — rien à enregistrer.", unresolved },
      { status: 422 }
    );
  }

  // ── ladderPoints / classXp actuels (avant course) ──────────────────────────
  const resolvedPlayerIds = resolved.map((r) => r.playerId);
  const classStats = await prisma.playerClassStats.findMany({
    where: { playerId: { in: resolvedPlayerIds } },
    include: { player: { select: { username: true } } },
  });
  const ladderPointsLookup = new Map<string, number>();
  const classXpLookup = new Map<string, number>();
  for (const s of classStats) {
    const key = `${s.player.username.toLowerCase()}::${s.carClass}`;
    ladderPointsLookup.set(key, s.ladderPoints);
    classXpLookup.set(key, s.classXp);
  }

  // calculateAll attend une map username→ladderPoints pour la classe de la course.
  const perEntryLadderPointsMap = new Map<string, number>();
  for (const e of extendedEntries) {
    if (e.carClass) {
      const key = `${e.username.toLowerCase()}::${e.carClass}`;
      perEntryLadderPointsMap.set(e.username.toLowerCase(), ladderPointsLookup.get(key) ?? 0);
    }
  }

  // ── Calcul (source de vérité unique) ────────────────────────────────────────
  const calculated = calculateAll(extendedEntries, durationMin, DEFAULT_FORMULA, perEntryLadderPointsMap);

  // ── Persistance ─────────────────────────────────────────────────────────────
  const ingestEntries: IngestEntry[] = calculated.map((calc) => {
    const meta = persistMeta.get(calc.username.toLowerCase())!;
    return {
      player: meta.player,
      calc,
      carNumber: meta.carNumber,
      laps: meta.laps,
      bestLapTimeSec: meta.bestLapTimeSec,
      finishStatus: meta.finishStatus,
      teamName: null,
      offtrackCount: meta.counts.offtrack,
      contactCount: meta.counts.contact,
      avertCount: meta.counts.avert,
      sanctionCount: meta.counts.sanction,
    };
  });

  const eventId = body.eventId ?? null;
  const event = eventId
    ? await prisma.event.findUnique({ where: { id: eventId }, select: { title: true, date: true, track: true } })
    : null;

  const dateValue =
    body.dateTime != null
      ? typeof body.dateTime === "number"
        ? new Date(body.dateTime < 1e12 ? body.dateTime * 1000 : body.dateTime) // s ou ms
        : new Date(body.dateTime)
      : new Date();
  const date = event?.date ?? (isNaN(dateValue.getTime()) ? new Date() : dateValue);
  const track = event?.track ?? body.track ?? "Circuit inconnu";
  const title = event?.title ?? body.track ?? "Course";

  let persistResult;
  try {
    persistResult = await persistDesktopResults({
      entries: ingestEntries,
      durationMin,
      processedBy: body.source ?? "lmu-steward-pads",
      eventId,
      title,
      track,
      date,
      sessionType: body.sessionType ?? null,
      ladderPointsLookup,
      classXpLookup,
    });
  } catch (err) {
    console.error("[ingest] Persist error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur d'enregistrement." },
      { status: 500 }
    );
  }

  // ── Classement mis à jour (classes concernées) ──────────────────────────────
  const affectedClasses = Array.from(
    new Set(extendedEntries.map((e) => e.carClass).filter((c): c is string => !!c))
  );
  const standingsByClass = await getClassStandings(affectedClasses);
  const standings = Array.from(standingsByClass.entries()).map(([classe, rows]) => ({
    classe,
    pilotes: rows.map((r) => ({
      rang: r.rang,
      username: r.username,
      discordId: r.discordId,
      ladderPoints: r.ladderPoints,
      palier: r.palier,
    })),
  }));

  return NextResponse.json({
    raceId: persistResult.raceHistoryId,
    raceSessionId: persistResult.raceSessionId,
    resolved,
    unresolved,
    standings,
  });
}
