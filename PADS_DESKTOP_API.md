# Contrat API Desktop PADS

API consommée par l'**app desktop** (fork de LMU Steward) pour résoudre les pilotes,
afficher le classement, et renvoyer les résultats débriefés au site.

Ce fichier **fait foi** : toute évolution du contrat doit y être reflétée.

---

## Authentification

Toutes les routes ci-dessous sont protégées par un **bearer token dédié**.

```
Authorization: Bearer <DESKTOP_API_SECRET>
```

- Variable d'environnement : `DESKTOP_API_SECRET` (clé **séparée** de `BOT_API_SECRET`).
- Header manquant / invalide / secret non configuré → **401** `{ "error": "Unauthorized" }`.

---

## 1. `GET /api/roster`

Liste des pilotes + leur classement par classe (mêmes données que la page `/classement`).

### Réponse `200`

```json
{
  "pilotes": [
    {
      "id": "clx…",
      "nom": "Vautour",
      "pseudoLMU": "Vautour",
      "pseudoDiscord": "vautour#0",
      "discordId": "123456789012345678",
      "classes": [
        { "classe": "LMGT3", "rang": 1, "palier": "Gold", "points": 412 }
      ]
    }
  ],
  "generatedAt": "2026-06-17T12:00:00.000Z"
}
```

| Champ                | Source DB                                | Notes |
|----------------------|------------------------------------------|-------|
| `id`                 | `Player.id`                              | |
| `nom`                | `Player.username`                        | Le site **ne stocke pas de nom civil** distinct → vaut le pseudo LMU. |
| `pseudoLMU`          | `Player.username`                        | **Clé de matching** côté `ingest`. |
| `pseudoDiscord`      | `Player.discordUsername`                 | Peut être `null`. |
| `discordId`          | `Player.discordId`                       | Peut être `null`. |
| `classes[].classe`   | `PlayerClassStats.carClass`              | `HYPERCAR` \| `LMP2` \| `GTE` \| `LMGT3` \| `LMP3`. |
| `classes[].rang`     | rang sur `ladderPoints` desc dans la classe | 1 = premier. |
| `classes[].palier`   | tier XP de classe (`LicenseConfig`)      | `Bronze`…`Diamant` — même sémantique que `/classement`. |
| `classes[].points`   | `PlayerClassStats.ladderPoints`          | Le « Rang Classement » / ELO. |

Un pilote sans aucune course classée a `classes: []`.

### Erreurs
| Code | Cas |
|------|-----|
| 401  | Bearer manquant ou invalide. |

---

## 2. `POST /api/results/ingest`

Reçoit le résultat débriefé (positions finales + sanctions manuelles + contacts
analysés), crée la course, applique résultats & sanctions, met à jour le classement.

> Le calcul ELO/ladder/réputation passe par **`calculateAll`** (`src/lib/rewards.ts`) —
> exactement le même code que la page admin d'ajout de course. Aucune réimplémentation.

### Corps (`application/json`)

```json
{
  "source": "lmu-steward-pads",
  "track": "Monza",
  "sessionType": "RACE",
  "dateTime": 1718625600000,
  "durationMin": 45,
  "eventId": "clx…",
  "drivers": [
    {
      "name": "pseudo LMU tel que dans le XML",
      "carNumber": "9",
      "carClass": "LMGT3",
      "finishPosition": 1,
      "gridPos": 3,
      "bestLapTime": 91.234,
      "laps": 20,
      "finishStatus": "Finished"
    }
  ],
  "sanctions": [
    {
      "driverName": "…", "carNumber": "9",
      "type": "TIME_PENALTY", "seconds": 5, "reason": "…", "et": 1234.5
    }
  ],
  "contacts": [
    {
      "et": 1234.5,
      "driverA": { "name": "…", "carNumber": "9" },
      "driverB": { "name": "…", "carNumber": "51" },
      "forceA": 820, "forceB": 240, "ratio": 3.4,
      "verdict": "SANCTION",
      "atFault": { "name": "…", "carNumber": "9" }
    }
  ]
}
```

#### Champs

| Champ                  | Type    | Requis | Notes |
|------------------------|---------|--------|-------|
| `source`               | string  | non    | Stocké dans `RaceSession.processedBy` (défaut `lmu-steward-pads`). |
| `track`                | string  | non*   | Nom du circuit. Ignoré si `eventId` fourni (on prend le circuit de l'événement). |
| `sessionType`          | string  | non    | Stocké tel quel (`RACE`, …). |
| `dateTime`             | number\|string | non | Epoch **s** (< 1e12) ou **ms**, ou ISO-8601. Défaut : maintenant. Ignoré si `eventId` fourni. |
| `durationMin`          | number  | **oui**| Durée course en minutes (> 0). Indispensable au calcul XP/argent. |
| `eventId`              | string  | non    | Si fourni, rattache la course à l'`Event` et reprend titre/date/circuit. |
| `drivers[]`            | array   | **oui**| Au moins 1 entrée. |
| `drivers[].name`       | string  | **oui**| Pseudo LMU — résolu contre `Player.username`. |
| `drivers[].carNumber`  | string  | non    | Sert au matching des sanctions/contacts. |
| `drivers[].carClass`   | string  | non    | Normalisé (`GT3`→`LMGT3`, `HYPER`→`HYPERCAR`, …). Sans classe → exclu du ladder. |
| `drivers[].finishPosition` | number | **oui** | Position finale (déjà post-pénalités côté desktop). |
| `drivers[].bestLapTime`| number  | non    | Secondes. `<= 0` ou absent → `null`. |
| `drivers[].laps`       | number  | non    | |
| `drivers[].finishStatus` | string| non    | `Finished` / `DNF` / `DSQ`… (`DNF`/`DSQ`/`DQ` = non terminé). |
| `sanctions[]`          | array   | non    | Sanctions manuelles. |
| `contacts[]`           | array   | non    | Contacts analysés avec verdict. |

\* `track` recommandé si pas d'`eventId` (sinon « Circuit inconnu »).

#### Mapping sanctions/contacts → compteurs de réputation

Les sanctions/contacts sont convertis en compteurs par pilote, injectés tels quels dans
`calculateReputation` (override) — ils pilotent **directement** la réputation et la
sévérité. Matching par `carNumber` si présent, sinon par nom normalisé.

| Source                                   | Compteur incrémenté |
|------------------------------------------|---------------------|
| `sanctions[].type == "WARNING"`          | `avert`             |
| `sanctions[].type` (autre : TIME_PENALTY, DSQ…) | `sanction`   |
| `contacts[].verdict == "SANCTION"` (→ `atFault`) | `sanction`  |
| `contacts[].verdict == "WARNING"` (→ `atFault`)  | `avert`     |
| `contacts[].verdict == "WALL_OR_SOLO"` (→ `atFault`/`driverA`) | `contact` |
| `contacts[].verdict` ∈ {RACING_INCIDENT, IGNORED, REVIEW} | *(ignoré)* |

- `offtrack` : non transmis par le desktop → toujours `0`.
- `incidents` (malus XP) = `offtrack + contact + avert + sanction`.
- `isClean` = vrai si `avert + sanction == 0` (offtrack et contact immovable ne comptent plus).

> Le `verdict` du contact (calculé par le desktop) prime. Les `forceA/forceB/ratio`
> sont indicatifs et **ne sont pas** re-classifiés ici (contrairement au parsing XML).

#### Résolution des noms

Normalisation avant matching contre `Player.username` : minuscules, accents retirés,
suffixe `#1234` retiré, espaces multiples réduits. Les pilotes **non résolus** ne font
**pas** échouer la requête : ils sont renvoyés dans `unresolved` et **non** créés.

### Réponse `200`

```json
{
  "raceId": "clx…",            // RaceHistory.id (la course archivée)
  "raceSessionId": "clx…",     // RaceSession.id
  "resolved": [
    { "name": "Vautour", "carNumber": "9", "playerId": "clx…", "username": "Vautour" }
  ],
  "unresolved": [
    { "name": "Inconnu", "carNumber": "77" }
  ],
  "standings": [
    {
      "classe": "LMGT3",
      "pilotes": [
        { "rang": 1, "username": "Vautour", "discordId": "123…", "ladderPoints": 416, "palier": "Gold" }
      ]
    }
  ]
}
```

`standings` ne contient que les classes concernées par la course, classement à jour.

### Effets en base
- `RaceSession` (1) + `RaceResult` (1 par pilote résolu)
- `Player` : `xp`, `money`, `finishedRaces`, `totalRaces`, `cleanRaces`, `reputation` (clampée 0–200)
- `PlayerClassStats` : `classXp` (+=), `ladderPoints` (recalculé via `ladderDelta`, plancher 0)
- `RaceHistory` (1, archive de la course)
- `Team.xp` (si le pilote a une équipe)

> Non gérés (données absentes côté desktop) : `ConstructorStandings`, `TrackRecord`.

### Erreurs
| Code | Cas |
|------|-----|
| 401  | Bearer manquant ou invalide. |
| 400  | JSON invalide / `drivers` vide / `durationMin` absent ou ≤ 0. |
| 422  | Aucun pilote résolu (rien à enregistrer) ; `unresolved` renvoyé. |
| 500  | Erreur d'enregistrement (transaction). |
