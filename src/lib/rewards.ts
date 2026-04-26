import type { RawEntry } from "./race-parser";

// ── Formula config ────────────────────────────────────────────────────────────

export interface RewardFormula {
  xpPerMin: number;        // XP de base par minute de course
  cleanBonusPct: number;   // % bonus XP si course propre (ex: 10 = +10%)
  moneyRatio: number;      // Argent = XP gagné × ratio
  reputationClean: number; // Points de réputation gagnés si course propre
  reputationDirty: number; // Points de réputation perdus si course sale
}

export const DEFAULT_FORMULA: RewardFormula = {
  xpPerMin: 10,
  cleanBonusPct: 10,
  moneyRatio: 0.5,
  reputationClean: 0,
  reputationDirty: 0,
};

// ── Calculated entry ──────────────────────────────────────────────────────────

export interface CalculatedEntry extends RawEntry {
  xpGained: number;
  moneyGained: number;
  reputationDelta: number; // positif = gain, négatif = perte
}

// ── Calculation ───────────────────────────────────────────────────────────────

export function calculateRewards(
  entry: RawEntry,
  totalPlayers: number,
  durationMin: number,
  formula: RewardFormula = DEFAULT_FORMULA
): CalculatedEntry {
  const baseXP = durationMin * formula.xpPerMin;

  // Position bonus : 1er = 100% du base en bonus, dernier = 0
  const positionBonus = Math.round(
    baseXP * Math.max(0, totalPlayers - entry.position) / totalPlayers
  );

  const rawXP = baseXP + positionBonus;

  // Bonus course propre
  const cleanBonus = entry.isClean
    ? Math.round(rawXP * (formula.cleanBonusPct / 100))
    : 0;

  const xpGained = rawXP + cleanBonus;
  const moneyGained = Math.round(xpGained * formula.moneyRatio);
  const reputationDelta = entry.isClean
    ? formula.reputationClean
    : -Math.abs(formula.reputationDirty);

  return { ...entry, xpGained, moneyGained, reputationDelta };
}

export function calculateAll(
  entries: RawEntry[],
  durationMin: number,
  formula: RewardFormula = DEFAULT_FORMULA
): CalculatedEntry[] {
  const total = entries.length;
  return entries.map((e) => calculateRewards(e, total, durationMin, formula));
}

// ── Parser helper (form data → RewardFormula) ─────────────────────────────────

export function parseFormulaFromForm(fd: FormData): RewardFormula {
  const n = (key: string, fallback: number) => {
    const v = parseFloat(fd.get(key) as string);
    return isNaN(v) ? fallback : v;
  };
  return {
    xpPerMin:        n("xpPerMin",        DEFAULT_FORMULA.xpPerMin),
    cleanBonusPct:   n("cleanBonusPct",   DEFAULT_FORMULA.cleanBonusPct),
    moneyRatio:      n("moneyRatio",       DEFAULT_FORMULA.moneyRatio),
    reputationClean: n("reputationClean",  DEFAULT_FORMULA.reputationClean),
    reputationDirty: n("reputationDirty",  DEFAULT_FORMULA.reputationDirty),
  };
}
