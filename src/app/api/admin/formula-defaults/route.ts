import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  finishBonus: 10,
  positionBase: 10,
  positionMultiplier: 1.5,
  podiumP1: 10,
  podiumP2: 7,
  podiumP3: 5,
  incidentMalusPct: 2,
  incidentMalusCap: 20,
  moneyBasePerMin: 50,
  coeffCourse: 1,
  organizerSharePct: 25,
  p1PrizePct: 10,
  pLastMinPct: 25,
  repBase: 3,
  repFinishBonus: 1,
  offtrackPenalty: 0.25,
  contactPenalty: 1,
  avertPenalty: 1,
  sanctionPenalty: 2,
  avertRatioMin: 2,
  sanctionRatioMin: 4,
  forceThreshold: 800,
  forceRatioMin: 1.05,
  ladderCoeff_sm: 4,
  ladderCoeff_md: 3,
  ladderCoeff_lg: 2,
};

export async function GET() {
  try {
    const saved = await prisma.formulaDefaults.findUnique({ where: { id: "singleton" } });
    return NextResponse.json(saved ?? DEFAULTS);
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const data = {
    finishBonus:        Number(body.finishBonus)        || DEFAULTS.finishBonus,
    positionBase:       Number(body.positionBase)       || DEFAULTS.positionBase,
    positionMultiplier: Number(body.positionMultiplier) || DEFAULTS.positionMultiplier,
    podiumP1:           Number(body.podiumP1)           || DEFAULTS.podiumP1,
    podiumP2:           Number(body.podiumP2)           || DEFAULTS.podiumP2,
    podiumP3:           Number(body.podiumP3)           || DEFAULTS.podiumP3,
    incidentMalusPct:   Number(body.incidentMalusPct)   || DEFAULTS.incidentMalusPct,
    incidentMalusCap:   Number(body.incidentMalusCap)   || DEFAULTS.incidentMalusCap,
    moneyBasePerMin:    Number(body.moneyBasePerMin)    || DEFAULTS.moneyBasePerMin,
    coeffCourse:        Number(body.coeffCourse)        || DEFAULTS.coeffCourse,
    organizerSharePct:  Number(body.organizerSharePct)  || DEFAULTS.organizerSharePct,
    p1PrizePct:         Number(body.p1PrizePct)         || DEFAULTS.p1PrizePct,
    pLastMinPct:        Number(body.pLastMinPct)        || DEFAULTS.pLastMinPct,
    repBase:            Number(body.repBase)            || DEFAULTS.repBase,
    repFinishBonus:     Number(body.repFinishBonus)     || DEFAULTS.repFinishBonus,
    offtrackPenalty:    Number(body.offtrackPenalty)    || DEFAULTS.offtrackPenalty,
    contactPenalty:     Number(body.contactPenalty)     || DEFAULTS.contactPenalty,
    avertPenalty:       Number(body.avertPenalty)       || DEFAULTS.avertPenalty,
    sanctionPenalty:    Number(body.sanctionPenalty)    || DEFAULTS.sanctionPenalty,
    avertRatioMin:      Number(body.avertRatioMin)      || DEFAULTS.avertRatioMin,
    sanctionRatioMin:   Number(body.sanctionRatioMin)   || DEFAULTS.sanctionRatioMin,
    forceThreshold:     Number(body.forceThreshold)     || DEFAULTS.forceThreshold,
    forceRatioMin:      Number(body.forceRatioMin)      || DEFAULTS.forceRatioMin,
    ladderCoeff_sm:     Number(body.ladderCoeff_sm)     || DEFAULTS.ladderCoeff_sm,
    ladderCoeff_md:     Number(body.ladderCoeff_md)     || DEFAULTS.ladderCoeff_md,
    ladderCoeff_lg:     Number(body.ladderCoeff_lg)     || DEFAULTS.ladderCoeff_lg,
  };

  const saved = await prisma.formulaDefaults.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  return NextResponse.json(saved);
}
