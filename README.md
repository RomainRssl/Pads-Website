# Par amour du spin — Sim Racing Community

Site web communautaire complet pour la gestion d'une ligue de Sim Racing : authentification Discord, calendrier de courses, traitement des résultats avec calcul de récompenses, statistiques des joueurs, multiplex de streams Twitch en direct et notifications automatiques via webhook Discord.

---

## Table des matières

1. [Fonctionnalités](#1-fonctionnalités)
2. [Prérequis](#2-prérequis)
3. [Cloner le projet](#3-cloner-le-projet)
4. [Installer les dépendances](#4-installer-les-dépendances)
5. [Configurer Discord](#5-configurer-discord)
6. [Configurer Twitch (optionnel)](#6-configurer-twitch-optionnel)
7. [Configurer les variables d'environnement](#7-configurer-les-variables-denvironnement)
8. [Initialiser la base de données](#8-initialiser-la-base-de-données)
9. [Configuration initiale via /setup](#9-configuration-initiale-via-setup)
10. [Lancer le projet en développement](#10-lancer-le-projet-en-développement)
11. [Déploiement sur VPS](#11-déploiement-sur-vps)
12. [Architecture du projet](#12-architecture-du-projet)
13. [Fonctionnement technique](#13-fonctionnement-technique)

---

## 1. Fonctionnalités

### Site public

| Page | Description |
|------|-------------|
| `/` | **Accueil** — Hero racing, calendrier des prochaines courses avec badges Jeu / Circuit / Voiture, indicateur de compte à rebours |
| `/lives` | **Multiplex Twitch** — Liste des membres en live avec statut en temps réel, sélection jusqu'à **10 streams simultanés**, grille adaptive, rafraîchissement auto toutes les 60 s |

### Panel d'administration (`/admin`)

Accessible uniquement aux membres possédant le rôle Discord configuré.

| Page | Description |
|------|-------------|
| `/admin` | **Tableau de bord** — Liste de tous les événements avec suppression |
| `/admin/create` | **Créer une course** — Formulaire (Titre, Date, Jeu, Circuit, Voiture, Description) + notification Discord automatique |
| `/admin/results` | **Traitement des résultats** — Upload JSON/CSV, prévisualisation des récompenses calculées, validation → mise à jour BDD + notification Discord |
| `/admin/streamers` | **Gestion des streamers** — Ajout/suppression des pseudos Twitch affichés sur `/lives` |

### Authentification & Rôles

- Connexion via **Discord OAuth2**
- À chaque connexion, le bot Discord vérifie automatiquement le rôle du membre sur le serveur
- Rôle `ADMIN` attribué si le membre possède le rôle Discord configuré (`ADMIN_ROLE_ID`), sinon `USER`
- Routes `/admin` protégées par middleware (Edge-compatible, sans appel base de données)

### Calcul des récompenses de course

Lors du traitement d'un fichier de résultats :

```
XP de base   = durée (minutes) × 10
Bonus pos.   = XP base × (nb joueurs − position) / nb joueurs
Bonus propre = +10 % XP si course sans incident
Argent       = XP total × 0,5
```

L'XP gagné est également reversé à la **Team** du joueur. Tous les joueurs non trouvés en base sont ignorés sans bloquer le traitement.

### Notifications Discord automatiques

Deux types d'embeds envoyés automatiquement :
- **Nouvelle course** : titre, jeu, circuit, voiture, date
- **Résultats traités** : top 3, plus gros gain XP, nombre de joueurs mis à jour

---

## 2. Prérequis

| Outil | Version minimale | Vérification |
|-------|-----------------|--------------|
| **Node.js** | 18.x ou supérieur | `node --version` |
| **npm** | 9.x ou supérieur | `npm --version` |
| **Git** | Toute version récente | `git --version` |

Vous aurez également besoin :
- D'un **compte Discord** avec accès aux paramètres développeur
- D'un **serveur Discord** dont vous êtes administrateur
- D'un compte **Twitch Developer** (optionnel, pour le statut live en temps réel)

---

## 3. Cloner le projet

```bash
git clone https://github.com/romainrssl/pads-website.git
cd pads-website
```

---

## 4. Installer les dépendances

```bash
npm install
```

| Package | Rôle |
|---------|------|
| `next` 15 | Framework React (App Router) |
| `next-auth` v5 | Authentification Discord OAuth2 |
| `@auth/prisma-adapter` | Liaison NextAuth ↔ base de données |
| `@prisma/client` | ORM pour accéder à la base SQLite |
| `discord.js` | Lecture des rôles Discord via l'API Bot REST |
| `zod` | Validation des données côté serveur |
| `tailwindcss` | Styles CSS utilitaires (thème dark/racing) |

---

## 5. Configurer Discord

Vous allez créer **une application** (pour le login OAuth2) et **un bot** (pour lire les rôles).

### 5.1 Créer l'application Discord

1. Rendez-vous sur le [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur **"New Application"** → nommez-la (ex. : `Par amour du spin`)
3. Dans **"OAuth2"**, copiez le **Client ID** → `DISCORD_CLIENT_ID`
4. Cliquez **"Reset Secret"** → copiez le secret → `DISCORD_CLIENT_SECRET`

**Configurer les URLs de redirection :**

5. Dans **"OAuth2" → "Redirects"**, ajoutez :
   - `http://localhost:3000/api/auth/callback/discord` (développement)
   - `http://localhost:3000/api/setup/callback` (setup initial, développement)
   - `https://votre-domaine.com/api/auth/callback/discord` (production)
   - `https://votre-domaine.com/api/setup/callback` (setup initial, production)
6. Cliquez **"Save Changes"**

### 5.2 Créer le Bot Discord

1. Dans le menu de gauche, cliquez sur **"Bot"**
2. Cliquez **"Add Bot"** puis confirmez
3. Cliquez **"Reset Token"** → copiez le token → `DISCORD_BOT_TOKEN`
4. Désactivez **"Public Bot"** (recommandé)
5. Aucun "Privileged Gateway Intent" requis

### 5.3 Inviter le bot sur votre serveur

1. Dans **"OAuth2" → "URL Generator"**
2. Cochez uniquement le scope `bot`
3. Dans **"Bot Permissions"**, cochez `View Channels`
4. Copiez l'URL générée, ouvrez-la, sélectionnez votre serveur → **"Autoriser"**

### 5.4 Créer le Webhook Discord (pour les annonces)

> **Alternative simplifiée** : Le webhook peut être créé automatiquement via la page `/setup` (voir section 9).

Manuellement :
1. Dans votre serveur Discord, clic droit sur le salon d'annonces → **"Modifier le salon"**
2. **"Intégrations"** → **"Créer un Webhook"**
3. Copiez l'URL du webhook → `DISCORD_WEBHOOK_URL`

### 5.5 Récupérer les IDs Discord

Activez le **Mode Développeur** : Paramètres Discord → **Avancé** → Mode développeur.

| Variable | Comment l'obtenir |
|----------|-------------------|
| `GUILD_ID` | Clic droit sur l'icône du serveur → "Copier l'identifiant du serveur" |
| `ADMIN_ROLE_ID` | Paramètres du serveur → Rôles → clic droit sur le rôle → "Copier l'identifiant du rôle" |

> Si le rôle admin n'existe pas encore, créez-le dans Paramètres du serveur → Rôles → "Créer un rôle", puis attribuez-le aux membres concernés.

---

## 6. Configurer Twitch (optionnel)

Sans configuration Twitch, la page `/lives` fonctionne toujours (les embeds s'affichent), mais le statut LIVE, le nombre de spectateurs et les miniatures ne seront pas disponibles.

### 6.1 Créer une application Twitch

1. Connectez-vous sur [dev.twitch.tv/console](https://dev.twitch.tv/console)
2. Cliquez **"Register Your Application"**
3. Nom : `Par amour du spin` (ou autre)
4. OAuth Redirect URLs : `http://localhost:3000` (peu importe, on n'utilise pas le flux utilisateur)
5. Category : **Website Integration**
6. Cliquez **"Create"**
7. Sur la page de votre application : copiez le **Client ID** → `TWITCH_CLIENT_ID`
8. Cliquez **"New Secret"** → copiez le secret → `TWITCH_CLIENT_SECRET`

### 6.2 Paramètre domaine pour les embeds Twitch

Twitch exige que le paramètre `parent` de l'embed corresponde exactement au domaine servi :

```bash
NEXT_PUBLIC_SITE_DOMAIN="localhost"          # développement
NEXT_PUBLIC_SITE_DOMAIN="votre-domaine.com"  # production (sans https://)
```

---

## 7. Configurer les variables d'environnement

```bash
cp .env.example .env.local
```

Ouvrez `.env.local` et renseignez toutes les valeurs :

```bash
# ── Base de données ───────────────────────────────────────────────────────────
DATABASE_URL="file:./dev.db"

# ── NextAuth ──────────────────────────────────────────────────────────────────
# Générer avec : openssl rand -base64 32
NEXTAUTH_SECRET="votre-secret-genere-ici"
NEXTAUTH_URL="http://localhost:3000"

# ── Discord OAuth2 ────────────────────────────────────────────────────────────
DISCORD_CLIENT_ID="123456789012345678"
DISCORD_CLIENT_SECRET="AbCdEfGhIjKlMnOpQrStUvWxYz123456"

# ── Discord Bot ───────────────────────────────────────────────────────────────
DISCORD_BOT_TOKEN="MTIzNDU2Ljc4OTAxMjM0NTY.AbCdEf.GhIjKlMnOpQrStUvWxYz"

# ── Serveur Discord (rempli automatiquement via /setup, ou manuellement) ──────
GUILD_ID="987654321098765432"
ADMIN_ROLE_ID="111222333444555666"
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# ── Twitch (optionnel) ────────────────────────────────────────────────────────
TWITCH_CLIENT_ID=""
TWITCH_CLIENT_SECRET=""
# Domaine exact pour les embeds Twitch (sans https://)
NEXT_PUBLIC_SITE_DOMAIN="localhost"
```

> **Important :** `.env.local` est ignoré par Git. Ne committez jamais vos secrets.

---

## 8. Initialiser la base de données

```bash
npm run db:push
```

Cette commande crée `prisma/dev.db` et génère toutes les tables :

| Table | Contenu |
|-------|---------|
| `User` | Comptes Discord connectés |
| `Account` / `Session` | Données NextAuth |
| `Event` | Courses planifiées |
| `GuildConfig` | Configuration Discord (remplie via /setup) |
| `Player` | Profils joueurs avec stats (XP, Argent, courses) |
| `Team` | Équipes avec XP cumulé |
| `RaceSession` | Historique des traitements de résultats |
| `RaceResult` | Résultat individuel par joueur par session |
| `TwitchStreamer` | Liste des membres à afficher sur /lives |

**Commandes disponibles :**

| Commande | Description |
|----------|-------------|
| `npm run db:push` | Synchronise le schéma → base de données |
| `npm run db:generate` | Régénère le client Prisma |
| `npm run db:studio` | Interface web pour visualiser/éditer les données |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Démarrer en production |

---

## 9. Configuration initiale via /setup

La page `/setup` permet de connecter votre serveur Discord **en un seul clic**, sans copier-coller d'IDs manuellement.

### Ce qu'elle automatise

| Sans /setup | Avec /setup |
|-------------|-------------|
| Copier `GUILD_ID` manuellement | ✅ Récupéré automatiquement |
| Créer le webhook Discord manuellement | ✅ Créé automatiquement dans le salon choisi |
| Copier `DISCORD_WEBHOOK_URL` | ✅ Sauvegardé automatiquement en base |
| Copier `ADMIN_ROLE_ID` | ✅ Sélectionné via une liste déroulante |

### Étapes

1. Démarrez le projet (`npm run dev`)
2. Rendez-vous sur **http://localhost:3000/setup**
3. Cliquez **"Connecter au serveur Discord"**
4. Discord vous demande :
   - Dans quel serveur ajouter le bot
   - Dans quel salon créer le webhook d'annonce
5. Vous êtes redirigé vers **/setup/roles**
6. Sélectionnez le rôle Discord qui donnera accès au panel admin
7. Cliquez **"Confirmer"** → configuration terminée

> **Prérequis :** Les URLs `http://localhost:3000/api/auth/callback/discord` et `http://localhost:3000/api/setup/callback` doivent être ajoutées dans les Redirects de votre application Discord avant de lancer /setup.

---

## 10. Lancer le projet en développement

```bash
npm run dev
```

Accès sur [http://localhost:3000](http://localhost:3000).

### Checklist de vérification

- [ ] **Accueil** → le hero et la section "Prochaines courses" s'affichent
- [ ] **Login Discord** → clic "Se connecter" → OAuth2 → retour avec avatar
- [ ] **Rôle admin** → si vous avez le bon rôle, le bouton "Admin" apparaît dans la navbar
- [ ] **Panel admin** → `/admin` accessible, redirection vers `/` sinon
- [ ] **Créer une course** → formulaire `/admin/create` → événement visible sur l'accueil + notification Discord
- [ ] **Résultats** → `/admin/results` → upload d'un fichier test → prévisualisation → validation
- [ ] **Lives** → `/lives` → sidebar de streamers, sélection d'un stream → iframe Twitch
- [ ] **Streamers** → `/admin/streamers` → ajout d'un pseudo Twitch → apparaît sur `/lives`

### Fichiers de test pour les résultats

**JSON** (`test-results.json`) :
```json
[
  { "position": 1, "username": "joueur1", "isClean": true },
  { "position": 2, "username": "joueur2", "isClean": true },
  { "position": 3, "username": "joueur3", "isClean": false }
]
```

**CSV** (`test-results.csv`) :
```
position,username,isClean
1,joueur1,true
2,joueur2,true
3,joueur3,false
```

> Les pseudos doivent correspondre exactement aux profils `Player` créés en base (via `npm run db:studio`).

---

## 11. Déploiement sur VPS

### 11.1 Préparer le serveur (Ubuntu/Debian)

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# PM2 pour garder le site en ligne
sudo npm install -g pm2
```

### 11.2 Déployer le projet

```bash
git clone https://github.com/romainrssl/pads-website.git /var/www/pads-website
cd /var/www/pads-website

npm install
cp .env.example .env.local
nano .env.local   # remplir toutes les variables de production

npm run db:push
npm run build
```

### 11.3 Lancer avec PM2

```bash
pm2 start npm --name "pads-website" -- start
pm2 save
pm2 startup   # copier-coller la commande affichée
```

### 11.4 Configurer Nginx

```bash
sudo nano /etc/nginx/sites-available/pads-website
```

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/pads-website /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 11.5 Certificat HTTPS gratuit

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

### 11.6 Variables de production

```bash
NEXTAUTH_URL="https://votre-domaine.com"
NEXT_PUBLIC_SITE_DOMAIN="votre-domaine.com"  # sans https://
```

Et dans le Discord Developer Portal, ajouter les redirects de production :
- `https://votre-domaine.com/api/auth/callback/discord`
- `https://votre-domaine.com/api/setup/callback`

---

## 12. Architecture du projet

```
├── prisma/
│   ├── schema.prisma              # Schéma complet (User, Event, Player, Team, TwitchStreamer…)
│   └── dev.db                     # Base SQLite locale (ignorée par Git)
│
├── src/
│   ├── auth.ts                    # NextAuth v5 — Discord OAuth2 + vérification rôle bot
│   ├── middleware.ts              # Protection Edge des routes /admin (JWT, sans DB)
│   │
│   ├── types/
│   │   └── next-auth.d.ts        # Augmentation de session (role, discordId)
│   │
│   ├── lib/
│   │   ├── prisma.ts             # Singleton PrismaClient
│   │   ├── config.ts             # Lecture config Discord (DB + fallback env vars)
│   │   ├── discord-bot.ts        # REST discord.js — rôles + liste des rôles du serveur
│   │   ├── discord-webhook.ts    # Embeds Discord — nouvelle course + résultats traités
│   │   ├── race-parser.ts        # Parser JSON et CSV des fichiers de résultats
│   │   ├── rewards.ts            # Calcul XP, argent, bonus position et course propre
│   │   └── twitch.ts             # Twitch Helix API — token, userInfo, liveStreams
│   │
│   └── app/
│       ├── layout.tsx             # Layout racine (Navbar, Footer, SessionProvider)
│       ├── page.tsx               # Accueil — calendrier des courses à venir
│       │
│       ├── lives/
│       │   └── page.tsx          # Multiplex Twitch (jusqu'à 10 streams)
│       │
│       ├── setup/
│       │   ├── page.tsx          # Configuration initiale — bouton "Connecter Discord"
│       │   ├── roles/page.tsx    # Sélecteur de rôle admin
│       │   └── done/page.tsx     # Confirmation de fin de setup
│       │
│       ├── api/
│       │   ├── auth/[...nextauth]/route.ts      # Handler NextAuth
│       │   ├── events/
│       │   │   ├── route.ts                     # GET (liste publique) / POST (admin)
│       │   │   └── [id]/route.ts                # DELETE (admin)
│       │   ├── setup/
│       │   │   ├── callback/route.ts            # OAuth2 callback — sauvegarde guild + webhook
│       │   │   └── roles/route.ts               # GET rôles / POST sauvegarde adminRoleId
│       │   ├── twitch/
│       │   │   └── live/route.ts                # GET statut live de tous les streamers
│       │   └── admin/
│       │       ├── streamers/
│       │       │   ├── route.ts                 # GET liste / POST ajout streamer
│       │       │   └── [id]/route.ts            # DELETE streamer
│       │       └── results/
│       │           ├── preview/route.ts         # POST parse + calcul (sans écriture DB)
│       │           └── process/route.ts         # POST transaction DB + notification Discord
│       │
│       ├── admin/
│       │   ├── layout.tsx         # Garde ADMIN + barre de navigation admin
│       │   ├── page.tsx           # Dashboard — tableau des événements
│       │   ├── create/page.tsx    # Formulaire création d'événement
│       │   ├── results/page.tsx   # Upload + prévisualisation + validation résultats
│       │   └── streamers/page.tsx # Gestion des streamers Twitch
│       │
│       └── components/
│           ├── SessionProvider.tsx
│           ├── layout/
│           │   ├── Navbar.tsx     # Nav principale avec lien Lives + bouton Discord
│           │   └── Footer.tsx
│           ├── events/
│           │   ├── EventCard.tsx  # Carte de course avec compte à rebours
│           │   ├── EventList.tsx  # Grille responsive des courses
│           │   └── EventBadge.tsx # Badge coloré (jeu / circuit / voiture)
│           ├── lives/
│           │   └── LiveMultiplex.tsx  # Sidebar streamers + grille d'iframes Twitch
│           └── admin/
│               ├── CreateEventForm.tsx   # Formulaire contrôlé avec feedback
│               ├── EventTable.tsx        # Tableau admin avec suppression
│               ├── ResultsUploadForm.tsx # Upload → aperçu → validation (3 étapes)
│               └── StreamerManager.tsx   # Ajout / suppression de streamers Twitch
```

---

## 13. Fonctionnement technique

### Authentification et rôles Discord

```
Clic "Se connecter avec Discord"
         │
         ▼
Discord OAuth2 (scopes : identify + email + guilds)
         │
         ▼
Callback NextAuth → jwt() dans src/auth.ts
  ├─ Appel REST : GET /guilds/{GUILD_ID}/members/{userId}
  │   (Bot Token, HTTP uniquement — pas de WebSocket)
  ├─ ADMIN_ROLE_ID dans member.roles[] → token.role = "ADMIN"
  ├─ Sinon → token.role = "USER"
  └─ Mise à jour du champ role en base de données
         │
         ▼
Rôle encodé dans le JWT (cookie httpOnly signé)
Accessible partout via auth() ou useSession()
```

**Pourquoi JWT et pas sessions base de données ?**
Le middleware Next.js s'exécute dans l'Edge Runtime (pas accès à Prisma). Le JWT permet de lire le rôle sans aucun appel base de données à chaque requête.

### Traitement des résultats de course

```
Admin uploade un fichier JSON ou CSV
         │
         ▼
POST /api/admin/results/preview
  ├─ race-parser.ts : détecte le format, parse les entrées
  ├─ rewards.ts : calcule XP et argent pour chaque joueur
  └─ Vérifie quels pseudos existent en DB → retourne preview[]
         │
         ▼
Admin valide l'aperçu
         │
         ▼
POST /api/admin/results/process
  ├─ Re-parse le fichier + recalcule
  └─ prisma.$transaction() :
       ├─ Crée RaceSession
       ├─ Pour chaque joueur trouvé :
       │   ├─ player.xp += xpGained
       │   ├─ player.money += moneyGained
       │   ├─ player.finishedRaces++
       │   ├─ player.cleanRaces++ (si isClean)
       │   ├─ Crée RaceResult
       │   └─ team.xp += xpGained (si teamId)
       └─ Notification Discord (fire-and-forget)
```

### Multiplex Twitch

```
/lives (Server Component) → liste les TwitchStreamer depuis DB
         │
         ▼
LiveMultiplex (Client Component)
  ├─ Mount → GET /api/twitch/live
  │   ├─ fetchUserInfos() : Helix /users → avatars, display names
  │   └─ fetchLiveStreams() : Helix /streams → live status, viewers, titre
  ├─ Refresh automatique toutes les 60 secondes
  ├─ Sidebar : streamers triés (live en haut) avec badge LIVE + viewers
  └─ Grille : jusqu'à 10 iframes Twitch simultanés
       Grille adaptive :
         1–2 streams → 2 colonnes
         3–4 streams → 2 colonnes
         5–6 streams → 3 colonnes
         7–10 streams → 4 à 5 colonnes
```

**Paramètre `parent` Twitch :** les embeds Twitch exigent que `parent` corresponde exactement au domaine servi. C'est le rôle de `NEXT_PUBLIC_SITE_DOMAIN`.

### Configuration via /setup

La page `/setup` évite la configuration manuelle des variables Discord en utilisant OAuth2 avec les scopes `bot + webhook.incoming` :

```
POST discord.com/oauth2/authorize (scopes: bot + webhook.incoming)
         │ Discord demande : quel serveur ? quel salon pour le webhook ?
         ▼
/api/setup/callback
  ├─ Échange le code OAuth2 contre un token
  ├─ Extrait guild.id et webhook.url de la réponse Discord
  └─ Sauvegarde en DB (table GuildConfig, singleton)
         │
         ▼
/setup/roles
  ├─ GET /guilds/{guildId}/roles via Bot Token
  └─ Admin choisit le rôle admin dans la liste → sauvegarde adminRoleId
```

La config DB est prioritaire sur les variables d'environnement (fallback pour compatibilité).

### Webhooks Discord

Deux fonctions dans `src/lib/discord-webhook.ts` :

| Fonction | Déclenchement | Contenu de l'embed |
|----------|--------------|-------------------|
| `sendEventNotification()` | Création d'une course | Titre, jeu, voiture, circuit, date |
| `sendRaceResultsNotification()` | Validation des résultats | Top 3, plus gros gain XP, résumé |

Les deux sont **fire-and-forget** : une erreur côté Discord ne bloque pas la réponse à l'utilisateur.
