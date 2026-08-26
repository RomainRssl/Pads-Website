// Fabrication du visuel de course, indépendamment du fournisseur.
//
// Le choix se fait par IMAGE_PROVIDER :
//   pollinations (défaut) — gratuit, sans clé ni compte
//   gemini                — nécessite un plan Google payant (la génération
//                           d'images n'est incluse dans aucun niveau sans frais)
//
// Une seule génération à la fois, avec une pause entre deux : les appels sont
// chaînés sur une file séquentielle en mémoire. Un refus temporaire est signalé
// par QuotaError(retryable) pour que l'appelant remette la demande en file
// (posterStatus = QUEUED) sans bloquer la publication de la course.

import sharp from "sharp";
import { generateGeminiImage } from "./gemini";

const PAUSE_ENTRE_APPELS_MS = 8_000;
const LARGEUR = 1200;
const HAUTEUR = 1100;

export type ImageProvider = "pollinations" | "gemini";

export function currentProvider(): ImageProvider {
  return process.env.IMAGE_PROVIDER === "gemini" ? "gemini" : "pollinations";
}

/**
 * Refus pour cause de quota ou de débit.
 *
 * `retryable` distingue une limite momentanée — une nouvelle tentative
 * aboutira — d'un plan qui n'accorde aucun droit sur le modèle, où réessayer
 * ne servirait à rien.
 */
export class QuotaError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "QuotaError";
    this.retryable = retryable;
  }
}

// ── File séquentielle ────────────────────────────────────────────────────────

let file: Promise<void> = Promise.resolve();

function enfiler<T>(job: () => Promise<T>): Promise<T> {
  const execution = file.then(job);
  // La file avance même si le job échoue, après la pause anti-rafale.
  const pause = () => new Promise<void>((r) => setTimeout(r, PAUSE_ENTRE_APPELS_MS));
  file = execution.then(pause, pause);
  return execution;
}

// ── Pollinations ─────────────────────────────────────────────────────────────

async function generatePollinationsImage(prompt: string): Promise<Buffer> {
  // Sans graine, un même prompt renvoie toujours la même image : chaque course
  // doit avoir son visuel, et « Régénérer » doit vraiment changer le résultat.
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const url =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?width=${LARGEUR}&height=${HAUTEUR}&nologo=true&seed=${seed}`;

  const reponse = await fetch(url, {
    signal: AbortSignal.timeout(120_000),
    headers: { Accept: "image/*" },
  });

  if (reponse.status === 429 || reponse.status === 503) {
    throw new QuotaError(
      "Service d'images momentanément saturé — nouvelle tentative automatique dans quelques minutes.",
      true
    );
  }
  if (!reponse.ok) {
    throw new Error(
      `Pollinations a répondu ${reponse.status} ${reponse.statusText}.`
    );
  }

  const type = reponse.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) {
    throw new Error(`Réponse inattendue de Pollinations (${type || "type absent"}).`);
  }

  return Buffer.from(await reponse.arrayBuffer());
}

// ── Point d'entrée ───────────────────────────────────────────────────────────

/**
 * Génère le visuel de scène et le renvoie prêt à écrire sur le disque :
 * 1200 × 1100, JPEG qualité 88.
 */
export function generateScene(prompt: string): Promise<Buffer> {
  const provider = currentProvider();

  return enfiler(async () => {
    const brut =
      provider === "gemini"
        ? await generateGeminiImage(prompt)
        : await generatePollinationsImage(prompt);

    return sharp(brut)
      .resize(LARGEUR, HAUTEUR, { fit: "cover", position: "centre" })
      .jpeg({ quality: 88 })
      .toBuffer();
  });
}
