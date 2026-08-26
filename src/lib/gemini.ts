// Génération du visuel de course via l'API Gemini.
//
// Une seule génération à la fois, avec une pause entre deux : les appels sont
// chaînés sur une file séquentielle en mémoire. Un refus pour quota est
// signalé par QuotaError pour que l'appelant remette la demande en file
// (posterStatus = QUEUED) sans bloquer la publication de la course.

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

// Modèle d'image, surchargeable sans redéploiement : les droits varient
// beaucoup d'un modèle à l'autre selon le plan Google (voir GEMINI_IMAGE_MODEL
// dans .env.example).
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";
const PAUSE_ENTRE_APPELS_MS = 8_000;

/**
 * Refus pour cause de quota (429).
 *
 * Deux situations très différentes derrière le même code :
 *  - `retryable` : limite de débit momentanée, une nouvelle tentative aboutira.
 *  - sinon : le plan ne donne aucun droit sur ce modèle (« limit: 0 »),
 *    typiquement la génération d'images sur le niveau sans frais. Réessayer
 *    est inutile — seule l'activation de la facturation débloque.
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
  file = execution.then(
    () => new Promise((r) => setTimeout(r, PAUSE_ENTRE_APPELS_MS)),
    () => new Promise((r) => setTimeout(r, PAUSE_ENTRE_APPELS_MS)),
  );
  return execution;
}

// ── Appel Gemini ─────────────────────────────────────────────────────────────

function estQuota(texte: string): boolean {
  return (
    /\b429\b/.test(texte) ||
    /RESOURCE_EXHAUSTED/i.test(texte) ||
    /quota/i.test(texte) ||
    /rate limit/i.test(texte)
  );
}

/**
 * « limit: 0 » signale un plan sans aucun droit sur ce modèle, pas une
 * limite momentanée : la génération d'images n'est pas incluse dans le
 * niveau sans frais de l'API Gemini.
 */
function estPlanSansDroit(texte: string): boolean {
  return /limit:\s*0\b/.test(texte);
}

async function appelerGemini(prompt: string): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY manquante dans l'environnement.");
  }

  const ai = new GoogleGenAI({ apiKey });

  let reponse;
  try {
    reponse = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
    });
  } catch (err) {
    const texte = err instanceof Error ? err.message : String(err);
    // Le message d'origine est journalisé : sans lui, un refus de quota est
    // indiscernable d'un modèle inaccessible.
    console.error(`[gemini] Échec sur ${MODEL} :`, texte);

    if (estQuota(texte)) {
      if (estPlanSansDroit(texte)) {
        throw new QuotaError(
          `Le plan Google associé à cette clé n'accorde aucun droit sur le ` +
            `modèle « ${MODEL} » (quota 0). Activez la facturation, ou ` +
            `choisissez un autre modèle via GEMINI_IMAGE_MODEL.`,
          false
        );
      }
      throw new QuotaError(
        "Limite de débit Gemini atteinte — nouvelle tentative automatique dans quelques minutes.",
        true
      );
    }
    throw err;
  }

  const parts = reponse.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return Buffer.from(part.inlineData.data, "base64");
    }
  }

  throw new Error(
    "Gemini n'a renvoyé aucune image (réponse texte ou vide)."
  );
}

/**
 * Génère le visuel de scène pour un prompt donné et le renvoie prêt à être
 * écrit sur le disque : 1200 × 1100, JPEG qualité 88.
 */
export function generateScene(prompt: string): Promise<Buffer> {
  return enfiler(async () => {
    const brut = await appelerGemini(prompt);
    return sharp(brut)
      .resize(1200, 1100, { fit: "cover", position: "centre" })
      .jpeg({ quality: 88 })
      .toBuffer();
  });
}
