// Rendu de l'affiche : le template poster.html est chargé dans Puppeteer,
// les données sont injectées avant le chargement de la page, et #poster est
// capturé en PNG une fois que le template signale body[data-ready="1"]
// (polices chargées + images décodées).
//
// L'instance Chromium est partagée et réutilisée entre les requêtes ; une
// seule capture à la fois, les autres attendent en file.

import { join } from "path";
import { pathToFileURL } from "url";
import puppeteer, { type Browser } from "puppeteer";
import type { PosterData } from "./poster";

const TEMPLATE_PATH = join(
  process.cwd(), "src", "lib", "poster-template", "poster.html"
);

// ── Instance Chromium partagée ───────────────────────────────────────────────

let navigateur: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (!navigateur) {
    navigateur = puppeteer
      .launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      })
      .then((b) => {
        // Un crash de Chromium ne doit pas rendre le service inutilisable :
        // on relancera une instance au prochain rendu.
        b.on("disconnected", () => { navigateur = null; });
        return b;
      });
    navigateur.catch(() => { navigateur = null; });
  }
  return navigateur;
}

// ── File séquentielle ────────────────────────────────────────────────────────

let file: Promise<void> = Promise.resolve();

function enfiler<T>(job: () => Promise<T>): Promise<T> {
  const execution = file.then(job);
  file = execution.then(() => undefined, () => undefined);
  return execution;
}

// ── Rendu ────────────────────────────────────────────────────────────────────

/** Capture l'affiche en PNG (2800 × 4200 : viewport 1400 × 2100, échelle 2). */
export function renderPoster(data: PosterData): Promise<Buffer> {
  return enfiler(async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1400, height: 2100, deviceScaleFactor: 2 });

      // Injecté avant tout script de la page : le template lit
      // window.POSTER_DATA au chargement. Nécessite une vraie navigation
      // (file://) — setContent ne crée pas de nouveau document et
      // n'exécuterait pas ce script.
      await page.evaluateOnNewDocument(
        `window.POSTER_DATA = ${JSON.stringify(data)};`
      );

      await page.goto(pathToFileURL(TEMPLATE_PATH).href, {
        waitUntil: "domcontentloaded",
      });

      // Neutralise la mise à l'échelle d'aperçu du template.
      await page.addStyleTag({ content: "#poster{transform:none !important}" });

      await page.waitForSelector('body[data-ready="1"]', { timeout: 30_000 });

      const poster = await page.$("#poster");
      if (!poster) throw new Error("Élément #poster introuvable dans le template.");

      return Buffer.from(await poster.screenshot({ type: "png" }));
    } finally {
      await page.close().catch(() => {});
    }
  });
}
