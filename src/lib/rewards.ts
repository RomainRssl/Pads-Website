import type { RawEntry } from "./race-parser";
import { CLASS_XP_TIERS, getTier, type Tier } from "./class-tiers";

// ── Formula config ────────────────────────────────────────────────────────────

export interface RewardFormula {
  // XP (nouvelle formule)
  // XP = durée + finishBonus + [positionBase + (N-pos) × positionMultiplier] + podium
  // XP final = XP × (1 - min(incidentMalusCap, incidents × incidentMalusPct) / 100)
  finishBonus:        number; // bonus plat pour avoir terminé la course (défaut 10)
  positionBase:       number; // base du bonus de position (défaut 10)
  positionMultiplier: number; // ×coefficient par rang gagné (défaut 1.5)
  podiumP1:           number; // bonus XP supplémentaire P1 (défaut 10)
  podiumP2:           number; // bonus XP supplémentaire P2 (défaut 7)
  podiumP3:           number; // bonus XP supplémentaire P3 (défaut 5)
  incidentMalusPct:   number; // % XP perdu par incident (défaut 2)
  incidentMalusCap:   number; // % max de malus total (défaut 20)

  // Argent PADS (système pool)
  moneyBasePerMin:   number; // PADS de base par minute (défaut 50)
  coeffCourse:       number; // coefficient difficulté (défaut 1.0)
  organizerSharePct: number; // % pool réservé à l'org (défaut 25)
  p1PrizePct:        number; // % du prize_pool pour P1 (défaut 10)
  pLastMinPct:       number; // % de la base pour le dernier (défaut 25)

  // Réputation (basée sur incidents XML)
  repDelta_01:    number; // gain si 0–1 incident  (défaut +3)
  repDelta_2:     number; // gain si 2 incidents   (défaut +1)
  repDelta_3:     number; // perte si 3 incidents  (défaut −1)
  repDelta_4plus: number; // perte si 4+ incidents (défaut −3)
  repFinishBonus: number; // bonus si terminé / non-DNF (défaut +1)

  // Ladder — coefficients selon taille de grille dans la classe
  ladderCoeff_sm: number; // 6–10 pilotes dans la classe (défaut 4)
  ladderCoeff_md: number; // 11–15 pilotes dans la classe (défaut 3)
  ladderCoeff_lg: number; // 16–20 pilotes dans la classe (défaut 2)
}

export const DEFAULT_FORMULA: RewardFormula = {
  finishBonus:        10,
  positionBase:       10,
  positionMultiplier: 1.5,
  podiumP1:           10,
  podiumP2:           7,
  podiumP3:           5,
  incidentMalusPct:   2,
  incidentMalusCap:   20,

  moneyBasePerMin:   50,
  coeffCourse:       1.0,
  organizerSharePct: 25,
  p1PrizePct:        10,
  pLastMinPct:       25,

  repDelta_01:    3,
  repDelta_2:     1,
  repDelta_3:    -1,
  repDelta_4plus:-3,
  repFinishBonus: 1,

  ladderCoeff_sm: 4,
  ladderCoeff_md: 3,
  ladderCoeff_lg: 2,
};

// ── Calculated entry ──────────────────────────────────────────────────────────

export interface CalculatedEntry extends RawEntry {
  xpGained:        number;
  moneyGained:     number;
  reputationDelta: number; // positif = gain, négatif = perte
  ladderDelta:     number; // points Ladder gagnés dans cette course
  carClass?:       string; // propagé depuis l'entrée étendue
}

// ── Reputation ────────────────────────────────────────────────────────────────

export function calculateReputation(
  incidents: number,
  finishStatus: string | undefined,
  formula: RewardFormula
): number {
  let delta: number;
  if (incidents <= 1)       delta = formula.repDelta_01;
  else if (incidents === 2) delta = formula.repDelta_2;
  else if (incidents === 3) delta = formula.repDelta_3;
  else                      delta = formula.repDelta_4plus;

  // Bonus si course terminée (non DNF/DSQ/DQ)
  const finished = !finishStatus || (
    finishStatus.toLowerCase() !== "dnf" &&
    finishStatus.toLowerCase() !== "dsq" &&
    finishStatus.toLowerCase() !== "dq"
  );
  if (finished) delta += formula.repFinishBonus;

  return delta;
}

// ── Ladder coefficient ────────────────────────────────────────────────────────

export function ladderCoefficient(totalInClass: number, formula: RewardFormula): number {
  if (totalInClass >= 6  && totalInClass <= 10) return formula.ladderCoeff_sm;
  if (totalInClass >= 11 && totalInClass <= 15) return formula.ladderCoeff_md;
  if (totalInClass >= 16 && totalInClass <= 20) return formula.ladderCoeff_lg;
  return 1;
}

/**
 * Points Ladder pour un pilote.
 * @param positionInTier  classement parmi les pilotes du même tier XP dans la course (1 = premier)
 * @param nInTier         nombre de pilotes du même tier XP dans la course
 * @param totalInClass    nombre total de pilotes dans la classe (détermine le coefficient)
 */
export function calculateLadderDelta(
  positionInTier: number,
  nInTier: number,
  totalInClass: number,
  formula: RewardFormula
): number {
  if (nInTier === 0) return 0;
  const coeff = ladderCoefficient(totalInClass, formula);
  const score = (nInTier + 1) / 2 - positionInTier;
  return Math.round(score * coeff);
}

// ── Entry étendue (union RawEntry + champs XML optionnels) ────────────────────

export interface ExtendedRawEntry extends RawEntry {
  carClass?:    string;
  finishStatus?: string;
}

// ── calculateAll ──────────────────────────────────────────────────────────────
//
// classXpMap : username (lowercase) → classXp actuel en DB (pour déterminer le
//              tier XP de chaque pilote avant cette course).
//              Peut être vide pour les fichiers CSV/JSON (Ladder non calculé).

export function calculateAll(
  entries: ExtendedRawEntry[],
  durationMin: number,
  formula: RewardFormula = DEFAULT_FORMULA,
  classXpMap: Map<string, number> = new Map(),
  classXpTiers: Tier[] = CLASS_XP_TIERS
): CalculatedEntry[] {
  // Grouper par classe
  const byClass = new Map<string, ExtendedRawEntry[]>();
  for (const e of entries) {
    const cls = e.carClass ?? "__default__";
    if (!byClass.has(cls)) byClass.set(cls, []);
    byClass.get(cls)!.push(e);
  }

  const results: CalculatedEntry[] = [];

  for (const [cls, group] of byClass.entries()) {
    const totalInClass = group.length;

    // Trier par position globale
    const sorted = [...group].sort((a, b) => a.position - b.position);

    // Déterminer le tier XP actuel de chaque pilote et les regrouper
    const tierGroups = new Map<string, ExtendedRawEntry[]>();
    for (const entry of sorted) {
      const currentXp = classXpMap.get(entry.username.toLowerCase()) ?? 0;
      const tierName = getTier(currentXp, classXpTiers).name;
      if (!tierGroups.has(tierName)) tierGroups.set(tierName, []);
      tierGroups.get(tierName)!.push(entry);
    }

    // position_dans_le_rang pour chaque pilote (parmi son tier XP, trié par position)
    const ladderPosMap = new Map<string, { posInTier: number; nInTier: number }>();
    for (const [, tierEntries] of tierGroups.entries()) {
      const tierSorted = [...tierEntries].sort((a, b) => a.position - b.position);
      tierSorted.forEach((e, idx) => {
        ladderPosMap.set(e.username.toLowerCase(), {
          posInTier: idx + 1,
          nInTier: tierSorted.length,
        });
      });
    }

    // ── Argent : calcul du pool par classe ───────────────────────────────────
    const moneyBase  = Math.round(durationMin * formula.moneyBasePerMin * formula.coeffCourse);
    const pool       = moneyBase * totalInClass;
    const prizePool  = pool * (1 - formula.organizerSharePct / 100);
    const p1Prize    = prizePool * (formula.p1PrizePct / 100);
    const pLastPrize = moneyBase * (formula.pLastMinPct / 100);

    // Calcul des récompenses
    sorted.forEach((entry, idx) => {
      const positionInClass = idx + 1;

      // XP de classe (nouvelle formule)
      const finished = !entry.finishStatus || (
        entry.finishStatus.toLowerCase() !== "dnf" &&
        entry.finishStatus.toLowerCase() !== "dsq" &&
        entry.finishStatus.toLowerCase() !== "dq"
      );
      const durationXP      = durationMin;
      const finishBonusXP   = finished ? formula.finishBonus : 0;
      const positionBonusXP = formula.positionBase +
        Math.round((totalInClass - positionInClass) * formula.positionMultiplier);
      const podiumBonusXP   = positionInClass === 1 ? formula.podiumP1
                            : positionInClass === 2 ? formula.podiumP2
                            : positionInClass === 3 ? formula.podiumP3
                            : 0;
      const rawXP = durationXP + finishBonusXP + positionBonusXP + podiumBonusXP;

      // Malus incidents (-incidentMalusPct% par incident, cap incidentMalusCap%)
      const malusPct = Math.min(formula.incidentMalusCap, entry.incidents * formula.incidentMalusPct);
      const xpGained = Math.round(rawXP * (1 - malusPct / 100));

      // Argent : base + prime dégressif P1 → Plast
      const positionPrize = totalInClass === 1
        ? p1Prize
        : p1Prize + (pLastPrize - p1Prize) * (positionInClass - 1) / (totalInClass - 1);
      const moneyGained = Math.round(moneyBase + positionPrize);

      // Réputation (incidents-based)
      const reputationDelta = calculateReputation(
        entry.incidents,
        entry.finishStatus,
        formula
      );

      // Ladder
      const ladderPos = ladderPosMap.get(entry.username.toLowerCase()) ?? {
        posInTier: positionInClass,
        nInTier: totalInClass,
      };
      const ladderDelta = calculateLadderDelta(
        ladderPos.posInTier,
        ladderPos.nInTier,
        totalInClass,
        formula
      );

      results.push({
        ...entry,
        carClass: cls === "__default__" ? undefined : cls,
        xpGained,
        moneyGained,
        reputationDelta,
        ladderDelta,
      });
    });
  }

  // Retrier le tableau final par position globale
  return results.sort((a, b) => a.position - b.position);
}

// ── Parser helper (form data → RewardFormula) ─────────────────────────────────

export function parseFormulaFromForm(fd: FormData): RewardFormula {
  const n = (key: string, fallback: number) => {
    const v = parseFloat(fd.get(key) as string);
    return isNaN(v) ? fallback : v;
  };
  return {
    finishBonus:        n("finishBonus",        DEFAULT_FORMULA.finishBonus),
    positionBase:       n("positionBase",       DEFAULT_FORMULA.positionBase),
    positionMultiplier: n("positionMultiplier", DEFAULT_FORMULA.positionMultiplier),
    podiumP1:           n("podiumP1",           DEFAULT_FORMULA.podiumP1),
    podiumP2:           n("podiumP2",           DEFAULT_FORMULA.podiumP2),
    podiumP3:           n("podiumP3",           DEFAULT_FORMULA.podiumP3),
    incidentMalusPct:   n("incidentMalusPct",   DEFAULT_FORMULA.incidentMalusPct),
    incidentMalusCap:   n("incidentMalusCap",   DEFAULT_FORMULA.incidentMalusCap),

    moneyBasePerMin:   n("moneyBasePerMin",   DEFAULT_FORMULA.moneyBasePerMin),
    coeffCourse:       n("coeffCourse",       DEFAULT_FORMULA.coeffCourse),
    organizerSharePct: n("organizerSharePct", DEFAULT_FORMULA.organizerSharePct),
    p1PrizePct:        n("p1PrizePct",        DEFAULT_FORMULA.p1PrizePct),
    pLastMinPct:       n("pLastMinPct",       DEFAULT_FORMULA.pLastMinPct),

    repDelta_01:    n("repDelta_01",    DEFAULT_FORMULA.repDelta_01),
    repDelta_2:     n("repDelta_2",     DEFAULT_FORMULA.repDelta_2),
    repDelta_3:     n("repDelta_3",     DEFAULT_FORMULA.repDelta_3),
    repDelta_4plus: n("repDelta_4plus", DEFAULT_FORMULA.repDelta_4plus),
    repFinishBonus: n("repFinishBonus", DEFAULT_FORMULA.repFinishBonus),

    ladderCoeff_sm: n("ladderCoeff_sm", DEFAULT_FORMULA.ladderCoeff_sm),
    ladderCoeff_md: n("ladderCoeff_md", DEFAULT_FORMULA.ladderCoeff_md),
    ladderCoeff_lg: n("ladderCoeff_lg", DEFAULT_FORMULA.ladderCoeff_lg),
  };
}
