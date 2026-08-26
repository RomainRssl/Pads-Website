// Fournisseur d'images Gemini.
//
// ⚠️ La génération d'images n'est incluse dans AUCUN niveau sans frais de
// l'API Gemini : tous les modèles d'image répondent 429 « limit: 0 » tant que
// la facturation n'est pas activée sur le projet Google. Le fournisseur par
// défaut est donc Pollinations (voir image-provider.ts).
//
// La file d'attente et le redimensionnement vivent dans image-provider.ts :
// ce module se contente de produire l'image brute.

import { GoogleGenAI } from "@google/genai";
import { QuotaError } from "./image-provider";

// Les droits varient beaucoup d'un modèle à l'autre selon le plan Google.
const MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";

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
 * limite momentanée : réessayer ne servirait à rien.
 */
function estPlanSansDroit(texte: string): boolean {
  return /limit:\s*0\b/.test(texte);
}

export async function generateGeminiImage(prompt: string): Promise<Buffer> {
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
            `repassez sur IMAGE_PROVIDER=pollinations.`,
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

  throw new Error("Gemini n'a renvoyé aucune image (réponse texte ou vide).");
}
