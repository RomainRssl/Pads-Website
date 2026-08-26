// Orchestration de la génération d'une affiche : scène Gemini puis rendu
// Puppeteer, avec mise à jour de posterStatus à chaque étape.
//
// Statuts : NONE → QUEUED → SCENE_OK → READY
//                    ↘ FAILED (posterError renseigné)
//           PURGED après le nettoyage hebdomadaire.
//
// Un refus pour quota Gemini laisse la course en QUEUED : la boucle de retry
// (démarrée par src/instrumentation.ts) retente toutes les 10 minutes.

import { randomBytes } from "crypto";
import { rename, writeFile } from "fs/promises";
import { prisma } from "./prisma";
import { buildPosterData, buildScenePrompt, type PosterSource } from "./poster";
import { generateScene, QuotaError } from "./gemini";
import { renderPoster } from "./poster-render";
import {
  draftPosterRelPath,
  draftSceneRelPath,
  ensureMediaDirs,
  isDraftToken,
  mediaAbsPath,
  mediaUrl,
  posterRelPath,
  sceneRelPath,
} from "./media";
import { readFile } from "fs/promises";

export type ResultatGeneration =
  | { statut: "READY" }
  | { statut: "QUEUED"; message: string }
  | { statut: "FAILED"; message: string };

/**
 * Génère (ou régénère) l'affiche d'une course.
 * `forceScene` régénère aussi le visuel Gemini quand il existe déjà.
 */
export async function generatePoster(
  eventId: string,
  { forceScene = false }: { forceScene?: boolean } = {},
): Promise<ResultatGeneration> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return { statut: "FAILED", message: "Course introuvable." };
  }

  const track = await prisma.track.findUnique({ where: { track: event.track } });
  if (!track) {
    const message =
      `Aucune fiche circuit pour « ${event.track} » — ` +
      `créez-la dans Admin → Circuits avant de générer l'affiche.`;
    await prisma.event.update({
      where: { id: eventId },
      data: { posterStatus: "FAILED", posterError: message },
    });
    return { statut: "FAILED", message };
  }

  await ensureMediaDirs();

  // ── 1. Visuel de scène (Gemini) ────────────────────────────────────────────
  let sceneRel = event.scenePath;
  if (!sceneRel || forceScene) {
    const prompt = buildScenePrompt(event, track);
    await prisma.event.update({
      where: { id: eventId },
      data: { posterStatus: "QUEUED", scenePrompt: prompt, posterError: null },
    });

    let sceneJpeg: Buffer;
    try {
      sceneJpeg = await generateScene(prompt);
    } catch (err) {
      if (err instanceof QuotaError) {
        // La course reste publiée sans affiche ; la demande reste en file.
        await prisma.event.update({
          where: { id: eventId },
          data: { posterStatus: "QUEUED", posterError: err.message },
        });
        return { statut: "QUEUED", message: err.message };
      }
      const message = err instanceof Error ? err.message : String(err);
      await prisma.event.update({
        where: { id: eventId },
        data: { posterStatus: "FAILED", posterError: message },
      });
      return { statut: "FAILED", message };
    }

    sceneRel = sceneRelPath(eventId);
    await writeFile(mediaAbsPath(sceneRel), sceneJpeg);
    await prisma.event.update({
      where: { id: eventId },
      data: { scenePath: sceneRel, posterStatus: "SCENE_OK", posterError: null },
    });
  }

  // ── 2. Rendu de l'affiche (Puppeteer) ──────────────────────────────────────
  try {
    // Le visuel part en data URI : le rendu ne dépend d'aucune route HTTP.
    const sceneJpeg = await readFile(mediaAbsPath(sceneRel));
    const sceneUrl = `data:image/jpeg;base64,${sceneJpeg.toString("base64")}`;

    const rafraichi = await prisma.event.findUniqueOrThrow({ where: { id: eventId } });
    const png = await renderPoster(buildPosterData(rafraichi, track, sceneUrl));

    const posterRel = posterRelPath(eventId);
    await writeFile(mediaAbsPath(posterRel), png);
    await prisma.event.update({
      where: { id: eventId },
      data: {
        posterPath: posterRel,
        posterStatus: "READY",
        posterError: null,
        posterAt: new Date(),
      },
    });
    return { statut: "READY" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.event.update({
      where: { id: eventId },
      data: { posterStatus: "FAILED", posterError: message },
    });
    return { statut: "FAILED", message };
  }
}

// ── Brouillons (prévisualisation depuis le formulaire de création) ───────────

export type ResultatPreview =
  | { statut: "READY"; token: string; url: string }
  | { statut: "QUEUED"; message: string }
  | { statut: "FAILED"; message: string };

/**
 * Génère une affiche à partir des données du formulaire, avant que la course
 * n'existe. Les fichiers sont écrits sous un jeton et rattachés à la course
 * par attachDraftPoster() au moment de la création.
 */
export async function generatePosterPreview(
  source: PosterSource,
  trackKey: string,
): Promise<ResultatPreview> {
  const track = await prisma.track.findUnique({ where: { track: trackKey } });
  if (!track) {
    return {
      statut: "FAILED",
      message:
        `Aucune fiche circuit pour « ${trackKey} » — ` +
        `créez-la dans Admin → Circuits avant de générer l'affiche.`,
    };
  }

  await ensureMediaDirs();
  const token = randomBytes(16).toString("hex");

  // ── 1. Visuel de scène (Gemini) ────────────────────────────────────────────
  let sceneJpeg: Buffer;
  try {
    sceneJpeg = await generateScene(buildScenePrompt(source, track));
  } catch (err) {
    if (err instanceof QuotaError) {
      return { statut: "QUEUED", message: err.message };
    }
    return {
      statut: "FAILED",
      message: err instanceof Error ? err.message : String(err),
    };
  }

  const sceneRel = draftSceneRelPath(token);
  await writeFile(mediaAbsPath(sceneRel), sceneJpeg);

  // ── 2. Rendu de l'affiche (Puppeteer) ──────────────────────────────────────
  try {
    const sceneUrl = `data:image/jpeg;base64,${sceneJpeg.toString("base64")}`;
    const png = await renderPoster(buildPosterData(source, track, sceneUrl));
    const posterRel = draftPosterRelPath(token);
    await writeFile(mediaAbsPath(posterRel), png);
    return { statut: "READY", token, url: mediaUrl(posterRel) };
  } catch (err) {
    return {
      statut: "FAILED",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Rattache un brouillon validé à la course qui vient d'être créée : les
 * fichiers sont renommés et la course passe en READY. Silencieux si le
 * brouillon a disparu — la course reste publiée, l'affiche est régénérable
 * depuis le tableau d'administration.
 */
export async function attachDraftPoster(
  eventId: string,
  token: string,
  scenePrompt?: string,
): Promise<boolean> {
  if (!isDraftToken(token)) return false;

  const sceneRel = sceneRelPath(eventId);
  const posterRel = posterRelPath(eventId);

  try {
    await ensureMediaDirs();
    await rename(mediaAbsPath(draftSceneRelPath(token)), mediaAbsPath(sceneRel));
    await rename(mediaAbsPath(draftPosterRelPath(token)), mediaAbsPath(posterRel));
  } catch (err) {
    console.error("[poster] Brouillon introuvable au rattachement :", err);
    return false;
  }

  await prisma.event.update({
    where: { id: eventId },
    data: {
      scenePath: sceneRel,
      posterPath: posterRel,
      scenePrompt: scenePrompt ?? null,
      posterStatus: "READY",
      posterError: null,
      posterAt: new Date(),
    },
  });
  return true;
}

// ── Boucle de retry ──────────────────────────────────────────────────────────

const RETRY_INTERVAL_MS = 10 * 60_000;

// Le flag vit sur globalThis : le rechargement à chaud du dev ne doit pas
// empiler les intervalles.
const global = globalThis as typeof globalThis & { __posterRetryLoop?: boolean };

/** Retente périodiquement les affiches restées en QUEUED (quota Gemini). */
export function startPosterRetryLoop(): void {
  if (global.__posterRetryLoop) return;
  global.__posterRetryLoop = true;

  setInterval(async () => {
    try {
      const enAttente = await prisma.event.findMany({
        where: { posterStatus: "QUEUED", date: { gte: new Date() } },
        orderBy: { date: "asc" },
        select: { id: true },
      });
      for (const { id } of enAttente) {
        const resultat = await generatePoster(id);
        // Quota toujours atteint : inutile d'insister sur les suivantes.
        if (resultat.statut === "QUEUED") break;
      }
    } catch (err) {
      console.error("[poster] Boucle de retry en échec :", err);
    }
  }, RETRY_INTERVAL_MS);
}
