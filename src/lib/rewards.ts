import type { RawEntry } from "./race-parser";

export interface CalculatedEntry extends RawEntry {
  xpGained: number;
  moneyGained: number;
}

const BASE_XP_PER_MIN = 10;
const CLEAN_RACE_BONUS = 0.1; // +10% XP for a clean lap
const MONEY_RATIO = 0.5;      // money = XP * 0.5

export function calculateRewards(
  entry: RawEntry,
  totalPlayers: number,
  durationMin: number
): CalculatedEntry {
  const baseXP = durationMin * BASE_XP_PER_MIN;

  // Position bonus: 1st gets full base XP as bonus, last gets 0
  const positionBonus = Math.round(
    baseXP * (totalPlayers - entry.position) / totalPlayers
  );

  const rawXP = baseXP + positionBonus;

  // Clean race bonus
  const cleanBonus = entry.isClean ? Math.round(rawXP * CLEAN_RACE_BONUS) : 0;
  const xpGained = rawXP + cleanBonus;
  const moneyGained = Math.round(xpGained * MONEY_RATIO);

  return { ...entry, xpGained, moneyGained };
}

export function calculateAll(
  entries: RawEntry[],
  durationMin: number
): CalculatedEntry[] {
  const total = entries.length;
  return entries.map((e) => calculateRewards(e, total, durationMin));
}
