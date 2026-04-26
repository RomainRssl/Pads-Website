import type { RawEntry } from "./race-parser";
import { CLASS_XP_TIERS, getTier } from "./class-tiers";

// ── Formula config ────────────────────────────────────────────────────────────

export interface RewardFormula {
  // XP
  xpPerMin:      number;  // XP de base par minute de course
  cleanBonusPct: number;  // % bonus XP si course propre (ex: 10 = +10%)

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
  xpPerMin:      10,
  cleanBonusPct: 10,

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
  classXpMap: Map<string, number> = new Map()
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
      const tierName = getTier(currentXp, CLASS_XP_TIERS).name;
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

      // XP de classe
      const baseXP = durationMin * formula.xpPerMin;
      const positionBonus = Math.round(
        baseXP * Math.max(0, totalInClass - positionInClass) / totalInClass
      );
      const rawXP = baseXP + positionBonus;
      const cleanBonus = entry.isClean
        ? Math.round(rawXP * (formula.cleanBonusPct / 100))
        : 0;
      const xpGained = rawXP + cleanBonus;

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
    xpPerMin:       n("xpPerMin",       DEFAULT_FORMULA.xpPerMin),
    cleanBonusPct:  n("cleanBonusPct",  DEFAULT_FORMULA.cleanBonusPct),

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
