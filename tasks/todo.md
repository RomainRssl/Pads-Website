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
