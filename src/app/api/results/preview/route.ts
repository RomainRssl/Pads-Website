// ── POST /api/results/preview ─────────────────────────────────────────────────
// Aperçu des récompenses (XP / argent / réputation / ladder) pour un résultat
// débriefé par l'app desktop, SANS rien enregistrer.
// Protégé par bearer DESKTOP_API_SECRET.
//
// Même calcul que /api/results/ingest (calculateAll, @/lib/rewards) — aucune
// réimplémentation, aucune persistance. Sert l'étape « Aperçu » du desktop,
// équivalent de /api/admin/results/preview pour la page admin du site.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDesktopAuthorized } from "@/lib/desktop-auth";
import { calculateAll, DEFAULT_FORMULA } from "@/lib/rewards";
import type { ExtendedRawEntry } from "@/lib/rewards";
import { normalizeLmuName } from "@/lib/race-ingest";

interface InDriver {
  name: string;
  carNumber?: string;
  carClass?: string;
  finishPosition: number;
  gridPos?: number;
  bestLapTime?: number;
  laps?: number;
  finishStatus?: string;
  // Compteurs d'incidents par pilote (édités dans l'aperçu desktop).
  offtrackCount?: number;
  contactCount?: number;
  avertCount?: number;
  sanctionCount?: number;
}
interface InSanction {
  driverName?: string;
  carNumber?: string;
  type?: string;
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
  verdict?: string;
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
  // Formule de récompenses personnalisée (« param carrière »). Fusionnée avec
  // DEFAULT_FORMULA ; les champs absents prennent la valeur par défaut.
  formula?: Record<string, number>;
}

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

const hasExplicitCounts = (d: InDriver): boolean =>
  d.offtrackCount != null ||
  d.contactCount != null ||
  d.avertCount != null ||
  d.sanctionCount != null;

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
    select: { id: true, username: true },
  });
  const byNormName = new Map<string, (typeof allPlayers)[number]>();
  for (const p of allPlayers) byNormName.set(normalizeLmuName(p.username), p);

  const driverKey = (d: { carNumber?: string; name?: string }) =>
    d.carNumber != null && d.carNumber !== ""
      ? `n:${String(d.carNumber)}`
      : `name:${normalizeLmuName(d.name ?? "")}`;

  // Compteurs dérivés de contacts/sanctions (fallback si non fournis explicitement).
  const derived = new Map<string, Counts>();
  const ensure = (key: string): Counts => {
    if (!derived.has(key)) derived.set(key, { offtrack: 0, contact: 0, avert: 0, sanction: 0 });
    return derived.get(key)!;
  };
  for (const s of body.sanctions ?? []) {
    const c = ensure(driverKey({ carNumber: s.carNumber, name: s.driverName }));
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
  }

  // ── Entrées résolues + non résolues ─────────────────────────────────────────
  const resolved: { username: string; carNumber: string | null }[] = [];
  const unresolved: { name: string; carNumber: string | null }[] = [];
  const extendedEntries: ExtendedRawEntry[] = [];
  const driverMeta = new Map<
    string,
    {
      carNumber: string | null;
      laps: number | null;
      bestLapTimeSec: number | null;
      finishStatus: string | null;
      foundInDb: boolean;
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

    const c = hasExplicitCounts(d)
      ? {
          offtrack: Number(d.offtrackCount) || 0,
          contact: Number(d.contactCount) || 0,
          avert: Number(d.avertCount) || 0,
          sanction: Number(d.sanctionCount) || 0,
        }
      : derived.get(driverKey({ carNumber: d.carNumber, name: d.name })) ?? {
          offtrack: 0,
          contact: 0,
          avert: 0,
          sanction: 0,
        };
    const incidents = c.offtrack + c.contact + c.avert + c.sanction;
    const isClean = c.avert + c.sanction === 0;

    extendedEntries.push({
      username: player.username,
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

    driverMeta.set(player.username.toLowerCase(), {
      carNumber,
      laps: typeof d.laps === "number" ? d.laps : null,
      bestLapTimeSec: typeof d.bestLapTime === "number" && d.bestLapTime > 0 ? d.bestLapTime : null,
      finishStatus: d.finishStatus ?? null,
      foundInDb: true,
      counts: c,
    });

    resolved.push({ username: player.username, carNumber });
  }

  // ── ladderPoints actuels (pour rang Ladder avant course) ────────────────────
  const resolvedPlayerIds = allPlayers
    .filter((p) => resolved.some((r) => r.username === p.username))
    .map((p) => p.id);
  const classStats = resolvedPlayerIds.length
    ? await prisma.playerClassStats.findMany({
        where: { playerId: { in: resolvedPlayerIds } },
        include: { player: { select: { username: true } } },
      })
    : [];
  const ladderPointsLookup = new Map<string, number>();
  for (const s of classStats) {
    ladderPointsLookup.set(`${s.player.username.toLowerCase()}::${s.carClass}`, s.ladderPoints);
  }
  const perEntryLadderPointsMap = new Map<string, number>();
  for (const e of extendedEntries) {
    if (e.carClass) {
      perEntryLadderPointsMap.set(
        e.username.toLowerCase(),
        ladderPointsLookup.get(`${e.username.toLowerCase()}::${e.carClass}`) ?? 0
      );
    }
  }

  // ── Calcul (sans persistance) ───────────────────────────────────────────────
  const formula = { ...DEFAULT_FORMULA, ...(body.formula ?? {}) } as typeof DEFAULT_FORMULA;
  const calculated = calculateAll(
    extendedEntries,
    durationMin,
    formula,
    perEntryLadderPointsMap
  );

  const previewRows = calculated.map((calc) => {
    const meta = driverMeta.get(calc.username.toLowerCase());
    return {
      username: calc.username,
      position: calc.position,
      carClass: calc.carClass,
      carNumber: meta?.carNumber ?? undefined,
      laps: meta?.laps ?? undefined,
      bestLapTimeSec: meta?.bestLapTimeSec ?? null,
      finishStatus: meta?.finishStatus ?? undefined,
      isClean: calc.isClean,
      incidents: calc.incidents,
      offtrack: meta?.counts.offtrack ?? 0,
      contact: meta?.counts.contact ?? 0,
      avert: meta?.counts.avert ?? 0,
      sanction: meta?.counts.sanction ?? 0,
      xpGained: calc.xpGained,
      moneyGained: calc.moneyGained,
      reputationDelta: calc.reputationDelta,
      ladderDelta: calc.ladderDelta,
      foundInDb: true,
    };
  });

  return NextResponse.json({
    durationMin,
    meta: {
      trackVenue: body.track ?? null,
      sessionType: body.sessionType ?? null,
      driverCount: drivers.length,
      resolvedCount: resolved.length,
    },
    preview: previewRows,
    unresolved,
  });
}
