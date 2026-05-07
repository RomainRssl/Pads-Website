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

// ── Liste complète des voitures par classe ───────────────────────────────────

export interface CarOption {
  class: CarClass;
  name: string;
}

export const CAR_MODELS: Record<CarClass, string[]> = {
  HYPERCAR: [
    "Alpine A424 (2024 Pack 2 DLC)",
    "Aston Martin Valkyrie AMR LMH Hypercar",
    "BMW M Hybrid V8 (free DLC)",
    "Cadillac V-Series.R",
    "Ferrari 499P",
    "Genesis GMR-001 LMDh",
    "Glickenhaus SCG 007",
    "Isotta Fraschini Tipo 6-C (2024 Pack 2 DLC)",
    "Lamborghini SC63 (2024 Pack 1 DLC)",
    "Peugeot 9X8 2023",
    "Peugeot 9X8 2024 (2024 Pack 1 DLC)",
    "Porsche 963",
    "Toyota GR010-Hybrid",
    "Vanwall Vandervell 680",
  ],
  LMP2: [
    "Oreca 07 Gibson",
    "Oreca 07 Gibson ELMS",
  ],
  GTE: [
    "Aston Martin Vantage GTE",
    "Chevrolet Corvette C8.R",
    "Ferrari 488 GTE Evo",
    "Porsche 911 RSR-19",
  ],
  LMGT3: [
    "Aston Martin Vantage AMR LMGT3 Evo (2024 Pack 4 DLC)",
    "BMW M4 LMGT3 (2024 Pack 3 DLC)",
    "BMW M4 LMGT3 Evo (2024 Pack 3 DLC)",
    "Chevrolet Corvette Z06 LMGT3.R (2024 Pack 3 DLC)",
    "Ferrari 296 LMGT3 (2024 Pack 3 DLC)",
    "Ford Mustang LMGT3 (free DLC)",
    "Lamborghini Huracán LMGT3 Evo 2 (2024 Pack 5 DLC)",
    "Lexus RC F LMGT3 (2024 Pack 5 DLC)",
    "Mercedes-AMG LMGT3",
    "McLaren 720S LMGT3 Evo (free DLC)",
    "Porsche 911 LMGT3 R (992) (2024 Pack 4 DLC)",
  ],
  LMP3: [
    "Ligier JS P325 (ELMS Season Pass or ELMS Pack 1 DLC)",
    "Ginetta G61-LT-P3 Evo (ELMS Season Pass or ELMS Pack 2 DLC)",
    "Duqueine D09 (ELMS Season Pass or ELMS Pack 3 DLC)",
  ],
};

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
