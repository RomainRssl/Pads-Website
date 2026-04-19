export interface LicenseConfig {
  id: string;
  label: string;
  minXp: number;
  color: string;
  order: number;
}

export const DEFAULT_LICENSES: LicenseConfig[] = [
  { id: "BRONZE",   label: "BRONZE",   minXp: 0,     color: "#CD7F32", order: 0 },
  { id: "SILVER",   label: "SILVER",   minXp: 1000,  color: "#C0C0C0", order: 1 },
  { id: "GOLD",     label: "GOLD",     minXp: 5000,  color: "#FFD700", order: 2 },
  { id: "PLATINUM", label: "PLATINUM", minXp: 15000, color: "#A8D8EA", order: 3 },
];

export function computeLicense(xp: number, configs: LicenseConfig[]) {
  const sorted = [...configs].sort((a, b) => a.order - b.order);
  if (sorted.length === 0) return null;

  let currentIdx = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (xp >= sorted[i].minXp) currentIdx = i;
  }

  const current = sorted[currentIdx];
  const next = sorted[currentIdx + 1] ?? null;
  const progress = next
    ? Math.min(100, Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100))
    : 100;

  return { current, next, progress };
}
