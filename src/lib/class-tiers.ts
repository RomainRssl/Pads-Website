// ── Tiers XP de classe (progression mastery) ─────────────────────────────────
// Valeurs par défaut — remplacées par LicenseConfig en DB si disponible

export interface Tier {
  name: string;
  min: number;
  color: string;
}

/** Tiers par défaut (fallback si la DB est vide) */
export const CLASS_XP_TIERS: Tier[] = [
  { name: "Bronze",  min: 0,     color: "#CD7F32" },
  { name: "Silver",  min: 500,   color: "#C0C0C0" },
  { name: "Gold",    min: 2000,  color: "#FFD700" },
  { name: "Platine", min: 5000,  color: "#E5E4E2" },
  { name: "Diamant", min: 10000, color: "#88EEFF" },
];

// ── Tiers Ladder (classement compétitif) — toujours hardcodés ────────────────

export const LADDER_TIERS: Tier[] = [
  { name: "Bronze",  min: 0,   color: "#CD7F32" },
  { name: "Silver",  min: 100, color: "#C0C0C0" },
  { name: "Gold",    min: 250, color: "#FFD700" },
  { name: "Platine", min: 400, color: "#E5E4E2" },
];

// ── Classes de voiture supportées ────────────────────────────────────────────

export const CAR_CLASSES = ["HYPERCAR", "LMP2", "GTE", "LMGT3", "LMP3"] as const;
export type CarClass = typeof CAR_CLASSES[number];

// ── Convertisseur LicenseConfig DB → Tier[] ──────────────────────────────────

/** Convertit les entrées LicenseConfig de la DB en Tier[].
 *  Fallback sur CLASS_XP_TIERS si le tableau est vide. */
export function tiersFromDb(
  configs: Array<{ label: string; minXp: number; color: string; order: number }>
): Tier[] {
  if (!configs.length) return CLASS_XP_TIERS;
  return [...configs]
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ name: c.label, min: c.minXp, color: c.color }));
}

// ── Fonctions utilitaires (acceptent des tiers injectés ou utilisent les défauts) ──

/** Retourne le tier correspondant à un nombre de points (XP ou Ladder) */
export function getTier(points: number, tiers: Tier[]): Tier {
  const sorted = [...tiers].sort((a, b) => b.min - a.min);
  return sorted.find((t) => points >= t.min) ?? tiers[0];
}

/** Tier XP de classe — utilise les tiers injectés ou CLASS_XP_TIERS par défaut */
export function getClassXpTier(classXp: number, tiers: Tier[] = CLASS_XP_TIERS): Tier {
  return getTier(classXp, tiers);
}

export function getLadderTier(ladderPoints: number): Tier {
  return getTier(ladderPoints, LADDER_TIERS);
}

/** Prochain palier XP (ou null si au max) — utilise les tiers injectés */
export function getNextClassXpTier(classXp: number, tiers: Tier[] = CLASS_XP_TIERS): Tier | null {
  const sorted = tiers.slice().sort((a, b) => a.min - b.min);
  return sorted.find((t) => t.min > classXp) ?? null;
}

/** Progrès vers le prochain palier XP [0–100] */
export function getClassXpProgress(classXp: number, tiers: Tier[] = CLASS_XP_TIERS): number {
  const current = getClassXpTier(classXp, tiers);
  const next = getNextClassXpTier(classXp, tiers);
  if (!next) return 100;
  return Math.round(((classXp - current.min) / (next.min - current.min)) * 100);
}
