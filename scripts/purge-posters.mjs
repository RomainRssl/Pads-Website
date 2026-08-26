// Purge hebdomadaire des affiches : les fichiers (scène + affiche) des
// courses terminées sont supprimés, sans archivage. posterStatus passe à
// PURGED et les chemins sont vidés en base.
//
// Exécution manuelle :
//   node --env-file=.env scripts/purge-posters.mjs
//
// Cron (tous les lundis à 04h00) :
//   0 4 * * 1 cd /var/www/paramourduspin && /usr/bin/node --env-file=.env scripts/purge-posters.mjs >> /var/log/pads-purge.log 2>&1

import { PrismaClient } from "@prisma/client";
import { readdir, stat, unlink } from "fs/promises";
import { join, normalize } from "path";

const prisma = new PrismaClient();
const MEDIA_DIR = process.env.MEDIA_DIR ?? join(process.cwd(), "media");

function absPath(rel) {
  const abs = normalize(join(MEDIA_DIR, rel));
  if (!abs.startsWith(normalize(MEDIA_DIR))) {
    throw new Error(`Chemin média invalide : ${rel}`);
  }
  return abs;
}

async function supprimer(rel) {
  try {
    await unlink(absPath(rel));
    return true;
  } catch (err) {
    if (err?.code === "ENOENT") return false; // déjà absent : rien à faire
    throw err;
  }
}

const terminees = await prisma.event.findMany({
  where: {
    date: { lt: new Date() },
    posterStatus: { notIn: ["NONE", "PURGED"] },
  },
  select: { id: true, title: true, scenePath: true, posterPath: true },
});

let fichiers = 0;
for (const course of terminees) {
  for (const rel of [course.scenePath, course.posterPath]) {
    if (rel && (await supprimer(rel))) fichiers += 1;
  }
  await prisma.event.update({
    where: { id: course.id },
    data: {
      posterStatus: "PURGED",
      scenePath: null,
      posterPath: null,
      posterError: null,
    },
  });
  console.log(`[purge] ${course.title} (${course.id}) → PURGED`);
}

console.log(
  `[purge] ${terminees.length} course(s) purgée(s), ${fichiers} fichier(s) supprimé(s).`
);

// ── Brouillons abandonnés ────────────────────────────────────────────────────
// Une affiche prévisualisée dont la course n'a jamais été créée reste sur le
// disque. On supprime ceux de plus de 24 h.
const AGE_MAX_MS = 24 * 60 * 60 * 1000;
let brouillons = 0;

for (const dossier of ["scenes", "posters"]) {
  let entrees;
  try {
    entrees = await readdir(join(MEDIA_DIR, dossier));
  } catch {
    continue; // dossier absent : rien à nettoyer
  }
  for (const nom of entrees) {
    if (!nom.startsWith("draft-")) continue;
    const chemin = join(MEDIA_DIR, dossier, nom);
    const infos = await stat(chemin);
    if (Date.now() - infos.mtimeMs > AGE_MAX_MS) {
      await unlink(chemin);
      brouillons += 1;
    }
  }
}

if (brouillons > 0) {
  console.log(`[purge] ${brouillons} brouillon(s) d'affiche abandonné(s) supprimé(s).`);
}

await prisma.$disconnect();
