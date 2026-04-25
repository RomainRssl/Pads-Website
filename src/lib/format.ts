/**
 * Formats a pilot's LMU username for public display.
 * "Romain Roussel" → "R Roussel"
 * "Xavier Dupont"  → "X Dupont"
 * Single-word usernames are returned as-is.
 */
export function formatPilotName(username: string): string {
  const parts = username.trim().split(/\s+/);
  if (parts.length <= 1) return username;
  return `${parts[0][0].toUpperCase()} ${parts.slice(1).join(" ")}`;
}
