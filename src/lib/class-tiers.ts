// ── Tiers XP de classe (progression mastery) ─────────────────────────────────
// Bronze < 500, Silver 500–1999, Gold 2000–4999, Platine 5000+

export interface Tier {
  name: string;
  min: number;
  color: string;
}

export const CLASS_XP_TIERS: Tier[] = [
  { name: "Bronze",  min: 0,    color: "#CD7F32" },
  { name: "Silver",  min: 500,  color: "#C0C0C0" },
  { name: "Gold",    min: 2000, color: "#FFD700" },
  { name: "Platine", min: 5000, color: "#E5E4E2" },
];

// ── Tiers Ladder (classement compétitif) ─────────────────────────────────────
// Bronze < 100, Silver 100–249, Gold 250–399, Platine 400+

export const LADDER_TIERS: Tier[] = [
  { name: "Bronze",  min: 0,   color: "#CD7F32" },
  { name: "Silver",  min: 100, color: "#C0C0C0" },
  { name: "Gold",    min: 250, color: "#FFD700" },
  { name: "Platine", min: 400, color: "#E5E4E2" },
];

// ── Classes de voiture supportées ────────────────────────────────────────────

export const CAR_CLASSES = ["GT3", "GTE", "LMP2", "LMP3", "HYPERCAR"] as const;
export type CarClass = typeof CAR_CLASSES[number];

/** Retourne le tier correspondant à un nombre de points (XP ou Ladder) */
export function getTier(points: number, tiers: Tier[]): Tier {
  // Parcours en ordre décroissant pour trouver le premier seuil franchi
  const sorted = [...tiers].sort((a, b) => b.min - a.min);
  return sorted.find((t) => points >= t.min) ?? tiers[0];
}

export function getClassXpTier(classXp: number): Tier {
  return getTier(classXp, CLASS_XP_TIERS);
}

export function getLadderTier(ladderPoints: number): Tier {
  return getTier(ladderPoints, LADDER_TIERS);
}

/** Prochain palier XP (ou null si déjà au max) */
export function getNextClassXpTier(classXp: number): Tier | null {
  const sorted = CLASS_XP_TIERS.slice().sort((a, b) => a.min - b.min);
  const next = sorted.find((t) => t.min > classXp);
  return next ?? null;
}

/** Progrès vers le prochain palier XP [0–100] */
export function getClassXpProgress(classXp: number): number {
  const current = getClassXpTier(classXp);
  const next = getNextClassXpTier(classXp);
  if (!next) return 100;
  const range = next.min - current.min;
  const done = classXp - current.min;
  return Math.round((done / range) * 100);
}
