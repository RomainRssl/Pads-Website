// Point d'entrée d'instrumentation Next.js — exécuté une fois au démarrage
// du serveur. Démarre la boucle de retry des affiches restées en file
// (quota Gemini atteint au moment de la génération).

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPosterRetryLoop } = await import("./lib/poster-pipeline");
    startPosterRetryLoop();
  }
}
