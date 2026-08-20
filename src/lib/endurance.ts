export const ENDURANCE_CAR_CLASSES = ["GT3", "HYPERCAR", "LMP2", "LMP3", "GTE"] as const;

export type EnduranceCarClass = (typeof ENDURANCE_CAR_CLASSES)[number];

export const ENDURANCE_CAR_CLASS_LABELS: Record<EnduranceCarClass, string> = {
  GT3: "GT3",
  HYPERCAR: "Hypercar",
  LMP2: "LMP2",
  LMP3: "LMP3",
  GTE: "GTE",
};

export function parseStringArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export const parseCarClasses = parseStringArray;

// Les heures de départ sont stockées en JSON comme un tableau de dates ISO —
// choisies par l'admin à la création, imposées aux pilotes à la déclaration
// de dispo. On filtre les entrées invalides (ex: anciens libellés texte
// saisis avant ce format) plutôt que de planter l'affichage.
export function parseStartTimes(raw: string): Date[] {
  return parseStringArray(raw)
    .map((t) => new Date(t))
    .filter((d) => !isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
}
