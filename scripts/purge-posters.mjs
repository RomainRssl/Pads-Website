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
import { unlink } from "fs/promises";
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

await prisma.$disconnect();
