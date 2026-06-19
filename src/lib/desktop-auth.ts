// ── Auth machine pour l'app desktop (LMU Steward PADS) ────────────────────────
// Bearer dédié, indépendant de BOT_API_SECRET (clé séparée comme demandé).

/** Vrai si la requête porte un bearer valide `Authorization: Bearer <DESKTOP_API_SECRET>`. */
export function isDesktopAuthorized(req: Request): boolean {
  const secret = process.env.DESKTOP_API_SECRET;
  if (!secret) return false; // pas de secret configuré → tout est refusé
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  return match[1].trim() === secret;
}
