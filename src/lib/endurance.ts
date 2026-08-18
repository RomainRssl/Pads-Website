export const ENDURANCE_CAR_CLASSES = ["GT3", "HYPERCAR", "LMP2", "LMP3", "GTE"] as const;

export type EnduranceCarClass = (typeof ENDURANCE_CAR_CLASSES)[number];

export const ENDURANCE_CAR_CLASS_LABELS: Record<EnduranceCarClass, string> = {
  GT3: "GT3",
  HYPERCAR: "Hypercar",
  LMP2: "LMP2",
  LMP3: "LMP3",
  GTE: "GTE",
};

export function parseCarClasses(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}
