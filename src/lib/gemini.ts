// Génération du visuel de course via l'API Gemini.
//
// Une seule génération à la fois, avec une pause entre deux : les appels sont
// chaînés sur une file séquentielle en mémoire. Un refus pour quota est
// signalé par QuotaError pour que l'appelant remette la demande en file
// (posterStatus = QUEUED) sans bloquer la publication de la course.

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

const MODEL = "gemini-2.5-flash-image";
const PAUSE_ENTRE_APPELS_MS = 8_000;

/** Quota atteint : à retenter plus tard, ce n'est pas une erreur définitive. */
export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaError";
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

function estQuota(err: unknown): boolean {
  const texte = err instanceof Error ? err.message : String(err);
  return (
    /\b429\b/.test(texte) ||
    /RESOURCE_EXHAUSTED/i.test(texte) ||
    /quota/i.test(texte) ||
    /rate limit/i.test(texte)
  );
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
    if (estQuota(err)) {
      throw new QuotaError(
        "Quota Gemini atteint — la génération sera retentée automatiquement."
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
