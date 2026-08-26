# Affiches FIS — plan d'implémentation

Décisions validées :
- `prisma db push` (pas de `migrate dev` — la prod est gérée en db push)
- Affiche affichée sur les cartes de la page d'accueil + publiable sur Discord (bouton admin)
- Champs affiche saisissables à la création ; génération depuis le tableau admin (EventTable)
- Retry quota : `setInterval` dans le process Next via `src/instrumentation.ts`
- Puppeteer avec Chromium embarqué
- Mapping modèle → classe pour les catégories ; "Mystère" → "???"
- Accès sortant supposé disponible (Discord/Twitch fonctionnent déjà depuis le VPS)

## Étapes

- [x] 1. `prisma/schema.prisma` : modèle `Track` + champs affiche dans `Event` (tous optionnels), `db push` validé sur une base de test
- [x] 2. `src/lib/lmu-cars.ts` : extraction de `LMU_CARS` depuis CreateEventForm (source unique du mapping modèle → classe)
- [x] 3. `src/lib/poster.ts` : fichier fourni + `categories()` adaptée au format réel de `Event.cars`
- [x] 4. `src/lib/poster-template/poster.html` : copie telle quelle du template
- [x] 5. `src/lib/media.ts` : répertoire `MEDIA_DIR` (scenes/, posters/), URLs `/media/...`
- [x] 6. `src/lib/gemini.ts` : appel Gemini séquentiel avec pause, sharp 1200×1100 JPEG 88, distinction quota / erreur dure
- [x] 7. `src/lib/poster-render.ts` : Puppeteer singleton + file, viewport 1400×2100 dsf 2, injection POSTER_DATA, attente data-ready, capture #poster en PNG
- [x] 8. Routes API : `/api/admin/tracks` (+ `[track]`), `/api/admin/events/[id]/poster` (générer/régénérer), `/api/admin/events/[id]/poster/discord` (publier), `/api/media/[...path]` (lecture seule)
- [x] 9. `src/instrumentation.ts` : retry des `QUEUED` toutes les 10 min
- [x] 10. Admin : fiches Track dans TrackSheetManager (page circuits) ; champs affiche dans CreateEventForm ; bloc affiche (état, aperçu, boutons) dans EventTable ; zod des routes events étendu
- [x] 11. Public : affiche dans EventCard quand READY, repli propre sinon
- [x] 12. `scripts/purge-posters.mjs` + ligne cron (fournie, pas installée)
- [x] 13. `.env.example` (GEMINI_API_KEY, MEDIA_DIR), .gitignore, bloc Nginx `/media/` (fourni, pas appliqué)
- [x] 14. `npm install sharp puppeteer @google/genai`, `npm run build` sans erreur

## Revue

- `db push` validé sur base vierge ; tous les nouveaux champs Event sont optionnels ou avec défaut → les courses existantes ne sont pas affectées.
- Rendu testé en réel (Puppeteer) : PNG 2800×4200 en ~2 s, données injectées correctement.
- Correctif important en cours de route : `page.setContent()` ne déclenche PAS `evaluateOnNewDocument` (pas de nouveau document) → navigation `file://` vers le template à la place.
- Bug préexistant corrigé au passage : l'édition inline d'EventTable envoyait `cars` en chaîne JSON au PATCH qui attend un tableau → sauvegarde impossible. Désormais parsé avant envoi.
- `/media/` : réécriture Next vers `/api/media/[...path]` (dev + repli) ; en prod Nginx sert le répertoire directement.
- Fusion avec `claude/sim-racing-discord-auth-Xq51k` (Laguna Seca/Daytona + circuits perso) : les deux modèles `CustomTrack` et `Track` cohabitent, les selects passent par `useTrackGroups()`, l'aide à la saisie des fiches inclut les circuits perso.
- Reste côté VPS (manuel) : GEMINI_API_KEY + MEDIA_DIR dans .env, mkdir /var/www/pads-media, bloc Nginx, cron de purge, npm install (Chromium + dépendances système).

---

# Circuits : Laguna Seca, Daytona + ajout manuel via admin

## Plan
- [x] Ajouter Laguna Seca & Daytona dans `src/lib/tracks.ts`
- [x] Ajouter leurs capacités dans `src/lib/circuit-capacity.ts`
- [x] Modèle Prisma `CustomTrack` (prod: `prisma db push`)
- [x] API `/api/admin/custom-tracks` (GET / POST / DELETE)
- [x] Hook client `useTrackGroups()` fusionnant liste statique + circuits perso
- [x] Brancher le hook dans CreateEventForm, EnduranceManager, EventTable
- [x] Section "Ajouter un circuit" + suppression dans CircuitsManager (/admin/circuits)
- [x] Vérif : `prisma generate` + `tsc --noEmit` + `next build` OK, `db push` validé sur base jetable

## Review
- "Daytona International Speedway" et "Laguna Seca (WeatherTech Raceway)" ajoutés au groupe "Le Mans Ultimate", capacité 50 chacun.
- Nouvelle table `CustomTrack` (nom = clé). ⚠️ Déploiement : lancer `npx prisma db push` sur le serveur (flux habituel, pas de migration).
- Les circuits ajoutés manuellement apparaissent dans un groupe "Circuits ajoutés" (avant "Mystère") dans tous les selects admin, avec gestion de capacité et suppression sur /admin/circuits.
- La suppression d'un circuit personnalisé ne touche pas les événements existants (le nom reste stocké en dur sur l'Event).
