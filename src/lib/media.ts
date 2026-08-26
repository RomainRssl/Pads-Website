// Stockage des fichiers d'affiches (scènes Gemini + affiches rendues).
//
// Les fichiers vivent hors du dépôt, dans MEDIA_DIR (par défaut
// /var/www/pads-media en production). La base ne stocke que des chemins
// relatifs ("scenes/<id>.jpg") : l'URL publique est /media/<chemin relatif>,
// servie par Nginx en production et par /api/media/[...path] partout ailleurs.

import { mkdir } from "fs/promises";
import { join, normalize } from "path";

export const MEDIA_DIR =
  process.env.MEDIA_DIR ?? join(process.cwd(), "media");

export function sceneRelPath(eventId: string): string {
  return `scenes/${eventId}.jpg`;
}

export function posterRelPath(eventId: string): string {
  return `posters/${eventId}.png`;
}

/** Chemin absolu sur le disque d'un chemin relatif stocké en base. */
export function mediaAbsPath(relPath: string): string {
  const abs = normalize(join(MEDIA_DIR, relPath));
  if (!abs.startsWith(normalize(MEDIA_DIR))) {
    throw new Error(`Chemin média invalide : ${relPath}`);
  }
  return abs;
}

/** URL publique d'un chemin relatif stocké en base. */
export function mediaUrl(relPath: string): string {
  return `/media/${relPath}`;
}

/** Crée les sous-dossiers scenes/ et posters/ si besoin. */
export async function ensureMediaDirs(): Promise<void> {
  await mkdir(join(MEDIA_DIR, "scenes"), { recursive: true });
  await mkdir(join(MEDIA_DIR, "posters"), { recursive: true });
}
