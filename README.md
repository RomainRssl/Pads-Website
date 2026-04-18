# Par amour du spin — Sim Racing Community

Site web communautaire pour la gestion des événements de Sim Racing, avec authentification Discord, panel d'administration protégé par rôles, et notifications automatiques via webhook Discord.

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Cloner le projet](#2-cloner-le-projet)
3. [Installer les dépendances](#3-installer-les-dépendances)
4. [Configurer Discord](#4-configurer-discord)
   - 4.1 [Créer une application Discord (OAuth2)](#41-créer-une-application-discord-oauth2)
   - 4.2 [Créer le Bot Discord](#42-créer-le-bot-discord)
   - 4.3 [Inviter le bot sur votre serveur](#43-inviter-le-bot-sur-votre-serveur)
   - 4.4 [Créer le Webhook Discord](#44-créer-le-webhook-discord)
   - 4.5 [Récupérer les IDs de votre serveur](#45-récupérer-les-ids-de-votre-serveur)
5. [Configurer les variables d'environnement](#5-configurer-les-variables-denvironnement)
6. [Initialiser la base de données](#6-initialiser-la-base-de-données)
7. [Lancer le projet en développement](#7-lancer-le-projet-en-développement)
8. [Déploiement en production](#8-déploiement-en-production)
9. [Architecture du projet](#9-architecture-du-projet)
10. [Fonctionnement technique](#10-fonctionnement-technique)

---

## 1. Prérequis

Avant de commencer, assurez-vous d'avoir installé sur votre machine :

| Outil | Version minimale | Vérification |
|-------|-----------------|--------------|
| **Node.js** | 18.x ou supérieur | `node --version` |
| **npm** | 9.x ou supérieur | `npm --version` |
| **Git** | Toute version récente | `git --version` |

Vous aurez également besoin :
- D'un **compte Discord** avec accès aux paramètres développeur
- D'un **serveur Discord** dont vous êtes administrateur (pour configurer les rôles et le webhook)

---

## 2. Cloner le projet

```bash
git clone https://github.com/romainrssl/pads-website.git
cd pads-website
```

---

## 3. Installer les dépendances

```bash
npm install
```

Cette commande installe toutes les dépendances listées dans `package.json` :

| Package | Rôle |
|---------|------|
| `next` 15 | Framework React (App Router) |
| `next-auth` v5 | Authentification (session Discord) |
| `@auth/prisma-adapter` | Liaison NextAuth ↔ base de données |
| `@prisma/client` | ORM pour accéder à la base SQLite |
| `discord.js` | Lecture des rôles Discord via l'API Bot |
| `zod` | Validation des données côté serveur |
| `tailwindcss` | Styles CSS utilitaires |

---

## 4. Configurer Discord

Cette étape est la plus importante. Vous allez créer deux entités distinctes sur Discord :
- Une **Application** (pour le login OAuth2 des utilisateurs)
- Un **Bot** (pour lire les rôles des membres en arrière-plan)

### 4.1 Créer une application Discord (OAuth2)

1. Rendez-vous sur le [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez sur **"New Application"** en haut à droite
3. Donnez un nom à votre application (ex. : `Par amour du spin`)
4. Cliquez sur **"Create"**

**Récupérer le Client ID et Client Secret :**

5. Dans le menu de gauche, cliquez sur **"OAuth2"**
6. Copiez le **Client ID** → ce sera votre `DISCORD_CLIENT_ID`
7. Cliquez sur **"Reset Secret"** puis copiez le secret → ce sera votre `DISCORD_CLIENT_SECRET`

**Configurer l'URL de redirection :**

8. Toujours dans **"OAuth2"**, section **"Redirects"**, cliquez sur **"Add Redirect"**
9. Ajoutez cette URL : `http://localhost:3000/api/auth/callback/discord`
10. En production, ajoutez également : `https://votre-domaine.com/api/auth/callback/discord`
11. Cliquez sur **"Save Changes"**

### 4.2 Créer le Bot Discord

Le bot est nécessaire pour vérifier si un utilisateur possède le rôle admin sur votre serveur. Il ne se connecte pas en temps réel (pas de gateway WebSocket) — il fait simplement une requête HTTP à chaque connexion d'un utilisateur.

1. Dans le menu de gauche, cliquez sur **"Bot"**
2. Cliquez sur **"Add Bot"** puis confirmez
3. Sous le nom du bot, cliquez sur **"Reset Token"** et copiez le token → ce sera votre `DISCORD_BOT_TOKEN`

> **Sécurité :** Ne partagez jamais ce token. Il donne un accès complet à votre bot.

**Permissions requises pour le bot :**

Le bot n'a besoin que de permissions minimales. Dans la section **"Bot"** :
- Désactivez **"Public Bot"** si vous ne voulez pas que d'autres puissent l'inviter
- Aucun "Privileged Gateway Intent" n'est nécessaire (le bot utilise uniquement l'API REST)

### 4.3 Inviter le bot sur votre serveur

Le bot doit être membre de votre serveur Discord pour pouvoir lire les rôles des membres.

1. Dans le menu de gauche, cliquez sur **"OAuth2"** → **"URL Generator"**
2. Dans **"Scopes"**, cochez uniquement : `bot`
3. Dans **"Bot Permissions"**, cochez : `View Channels` (permission minimale)
4. Copiez l'URL générée en bas de page et ouvrez-la dans votre navigateur
5. Sélectionnez votre serveur et cliquez sur **"Autoriser"**

### 4.4 Créer le Webhook Discord

Le webhook permet d'envoyer automatiquement un message dans un salon Discord à chaque fois qu'une course est créée.

1. Ouvrez votre serveur Discord
2. Faites un clic droit sur le **salon** où vous voulez recevoir les annonces de courses
3. Cliquez sur **"Modifier le salon"**
4. Dans le menu de gauche, cliquez sur **"Intégrations"**
5. Cliquez sur **"Créer un Webhook"**
6. Donnez-lui un nom (ex. : `Spin Bot`) et optionnellement une photo de profil
7. Cliquez sur **"Copier l'URL du Webhook"** → ce sera votre `DISCORD_WEBHOOK_URL`
8. Cliquez sur **"Enregistrer"**

### 4.5 Récupérer les IDs de votre serveur

Pour récupérer des IDs sur Discord, vous devez d'abord activer le **Mode Développeur** :

1. Ouvrez Discord → **Paramètres utilisateur** (engrenage) → **Avancé**
2. Activez **"Mode développeur"**

**Récupérer le GUILD_ID (ID de votre serveur) :**

3. Faites un clic droit sur l'**icône de votre serveur** dans la barre latérale gauche
4. Cliquez sur **"Copier l'identifiant du serveur"** → ce sera votre `GUILD_ID`

**Récupérer le ADMIN_ROLE_ID (ID du rôle admin) :**

5. Dans votre serveur, allez dans **Paramètres du serveur** → **Rôles**
6. Faites un clic droit sur le rôle que vous souhaitez utiliser comme rôle admin
7. Cliquez sur **"Copier l'identifiant du rôle"** → ce sera votre `ADMIN_ROLE_ID`

> **Note :** Si le rôle n'existe pas encore, créez-le d'abord dans Paramètres du serveur → Rôles → "Créer un rôle", puis attribuez-le aux membres qui doivent avoir accès au panel admin.

---

## 5. Configurer les variables d'environnement

Copiez le fichier d'exemple et remplissez-le avec vos valeurs :

```bash
cp .env.example .env.local
```

Ouvrez `.env.local` et renseignez chaque variable :

```bash
# ── Base de données ───────────────────────────────────────────────────────────
# Chemin relatif au fichier prisma/schema.prisma
# Ne pas modifier sauf si vous changez l'emplacement de la DB
DATABASE_URL="file:./dev.db"

# ── NextAuth ──────────────────────────────────────────────────────────────────
# Clé secrète pour signer les tokens JWT — générer avec :
# openssl rand -base64 32
NEXTAUTH_SECRET="votre-secret-genere"

# URL de votre application (sans slash final)
NEXTAUTH_URL="http://localhost:3000"

# ── Discord OAuth2 ────────────────────────────────────────────────────────────
# Depuis Developer Portal → votre application → OAuth2
DISCORD_CLIENT_ID="123456789012345678"
DISCORD_CLIENT_SECRET="AbCdEfGhIjKlMnOpQrStUvWxYz123456"

# ── Discord Bot ───────────────────────────────────────────────────────────────
# Depuis Developer Portal → votre application → Bot → Reset Token
DISCORD_BOT_TOKEN="MTIzNDU2Ljc4OTAxMjM0NTY.AbCdEf.GhIjKlMnOpQrStUvWxYz123456"

# ── Serveur Discord ───────────────────────────────────────────────────────────
# Clic droit sur votre serveur → "Copier l'identifiant du serveur"
GUILD_ID="987654321098765432"

# Clic droit sur le rôle admin → "Copier l'identifiant du rôle"
ADMIN_ROLE_ID="111222333444555666"

# ── Webhook Discord ───────────────────────────────────────────────────────────
# Salon Discord → Intégrations → Webhooks → Copier l'URL
DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/123456789/AbCdEfGhIjKlMnOpQrStUvWxYz"
```

> **Important :** Le fichier `.env.local` est ignoré par Git (listé dans `.gitignore`). Ne committez jamais vos secrets.

---

## 6. Initialiser la base de données

Cette commande crée le fichier SQLite `prisma/dev.db` et génère toutes les tables décrites dans `prisma/schema.prisma` :

```bash
npm run db:push
```

Vous devriez voir :
```
🚀  Your database is now in sync with your Prisma schema.
✔ Generated Prisma Client
```

**Commandes Prisma disponibles :**

| Commande | Description |
|----------|-------------|
| `npm run db:push` | Synchronise le schéma → base de données (développement) |
| `npm run db:generate` | Régénère le client Prisma après modification du schéma |
| `npm run db:studio` | Ouvre une interface web pour visualiser/éditer les données |

> **Note :** En production, utilisez `npx prisma migrate deploy` à la place de `db:push` pour des migrations versionnées.

---

## 7. Lancer le projet en développement

```bash
npm run dev
```

Le site est accessible sur [http://localhost:3000](http://localhost:3000).

**Vérifications à faire au premier lancement :**

1. **Page d'accueil** → doit s'afficher avec le hero et la section "Prochaines courses" (vide au départ)
2. **Connexion Discord** → cliquer sur "Se connecter" → redirection vers Discord → retour sur le site avec votre avatar affiché
3. **Vérification du rôle** → si votre compte Discord possède le rôle `ADMIN_ROLE_ID` sur le serveur `GUILD_ID`, un bouton "Admin" apparaît dans la navbar
4. **Panel admin** → accessible sur [http://localhost:3000/admin](http://localhost:3000/admin) uniquement si vous êtes ADMIN
5. **Création d'événement** → remplir le formulaire sur `/admin/create` → vérifier que l'événement apparaît sur la home et que le webhook Discord a envoyé un message

---

## 8. Déploiement en production

### Variables d'environnement

En production, modifiez :
```bash
NEXTAUTH_URL="https://votre-domaine.com"
```

Ajoutez également l'URL de redirection dans le Discord Developer Portal :
```
https://votre-domaine.com/api/auth/callback/discord
```

### Build

```bash
npm run build
npm run start
```

### Recommandations

- **Base de données** : Pour une mise en production robuste, migrez de SQLite vers PostgreSQL ou MySQL. Remplacez dans `prisma/schema.prisma` : `provider = "postgresql"` et adaptez le `DATABASE_URL`.
- **Hébergement** : Le projet est compatible avec Vercel (déploiement automatique depuis GitHub), Railway, ou tout serveur Node.js.
- **Migrations** : Utilisez `npx prisma migrate dev` en développement et `npx prisma migrate deploy` en production pour versionner les évolutions de schéma.

---

## 9. Architecture du projet

```
├── prisma/
│   ├── schema.prisma          # Schéma de la base de données
│   └── dev.db                 # Base SQLite (ignorée par Git)
│
├── src/
│   ├── auth.ts                # Configuration NextAuth (cœur de l'auth)
│   ├── middleware.ts          # Protection des routes /admin
│   │
│   ├── types/
│   │   └── next-auth.d.ts     # Extension des types de session (role, discordId)
│   │
│   ├── lib/
│   │   ├── prisma.ts          # Singleton PrismaClient (évite les connexions multiples)
│   │   ├── discord-bot.ts     # Lecture des rôles via l'API Discord REST
│   │   └── discord-webhook.ts # Construction et envoi des embeds Discord
│   │
│   └── app/
│       ├── layout.tsx          # Layout racine (Navbar, Footer, SessionProvider)
│       ├── page.tsx            # Page d'accueil (calendrier des courses)
│       │
│       ├── api/
│       │   ├── auth/[...nextauth]/route.ts  # Handler NextAuth
│       │   └── events/
│       │       ├── route.ts               # GET (liste) / POST (création)
│       │       └── [id]/route.ts          # GET (détail) / DELETE
│       │
│       ├── admin/
│       │   ├── layout.tsx      # Layout admin (vérification rôle serveur)
│       │   ├── page.tsx        # Tableau de bord admin
│       │   └── create/page.tsx # Formulaire de création d'événement
│       │
│       └── components/
│           ├── SessionProvider.tsx        # Wrapper client pour NextAuth
│           ├── layout/Navbar.tsx          # Barre de navigation
│           ├── layout/Footer.tsx
│           ├── events/EventCard.tsx       # Carte d'un événement
│           ├── events/EventList.tsx       # Grille d'événements
│           ├── events/EventBadge.tsx      # Badge coloré (jeu, circuit, voiture)
│           ├── admin/CreateEventForm.tsx  # Formulaire contrôlé
│           └── admin/EventTable.tsx       # Tableau admin avec suppression
```

---

## 10. Fonctionnement technique

### Flux d'authentification et attribution des rôles

```
1. L'utilisateur clique "Se connecter avec Discord"
          │
          ▼
2. Redirection vers discord.com/oauth2/authorize
   (scopes : identify + email + guilds)
          │
          ▼
3. Discord redirige vers /api/auth/callback/discord
   avec un code d'autorisation
          │
          ▼
4. NextAuth échange le code contre un access_token Discord
          │
          ▼
5. Callback jwt() dans src/auth.ts :
   ┌─ Récupère l'ID Discord de l'utilisateur (profile.id)
   ├─ Appelle discord-bot.ts → GET /guilds/{GUILD_ID}/members/{userId}
   │    (requête HTTP avec le Bot Token, pas de WebSocket)
   ├─ Vérifie si ADMIN_ROLE_ID est dans member.roles[]
   ├─ token.role = "ADMIN" ou "USER"
   └─ Met à jour le champ role en base de données
          │
          ▼
6. Le rôle est encodé dans le JWT (cookie httpOnly)
   Accessible dans toute l'application via auth() ou useSession()
```

### Protection des routes admin

Le fichier `src/middleware.ts` s'exécute sur chaque requête vers `/admin/*` **avant** que la page ne soit rendue. Il lit le JWT directement (sans appel à la base de données, ce qui est essentiel pour la performance en Edge runtime) et redirige vers `/` si l'utilisateur n'est pas ADMIN.

### Pourquoi JWT et pas sessions en base de données ?

NextAuth supporte deux stratégies de session :
- **`database`** : la session est stockée en base, le middleware doit faire un appel DB à chaque requête
- **`jwt`** : la session est un token signé dans un cookie, lisible sans DB

Le middleware Next.js s'exécute dans l'**Edge Runtime** (workers V8 légers), qui ne peut pas utiliser Prisma (qui requiert Node.js complet). Le choix `strategy: "jwt"` est donc obligatoire pour que le middleware puisse vérifier le rôle sans accès base de données.

### Pourquoi discord.js sans gateway ?

discord.js est souvent utilisé pour des bots "temps réel" qui maintiennent une connexion WebSocket persistante avec Discord (le "gateway"). Dans un contexte Next.js serverless, il est impossible de maintenir une telle connexion — les fonctions s'exécutent à la demande et s'éteignent immédiatement après.

Ce projet utilise uniquement la classe `REST` de discord.js, qui fait des appels HTTP ponctuels à l'API Discord :
```
GET https://discord.com/api/v10/guilds/{GUILD_ID}/members/{USER_ID}
Authorization: Bot {DISCORD_BOT_TOKEN}
```
Pas de connexion persistante, parfaitement compatible serverless.

### Notifications Discord (Webhook)

À la création d'un événement, un "embed" Discord riche est envoyé via `fetch` sur l'URL du webhook. L'envoi est **fire-and-forget** : si Discord est temporairement indisponible, l'événement est quand même créé en base et l'erreur est simplement loggée côté serveur.

```
POST {DISCORD_WEBHOOK_URL}
Content-Type: application/json

{
  "username": "Spin Bot",
  "embeds": [{
    "title": "🏁 Nouvelle course — ...",
    "color": 15087942,   // Rouge racing #E63946
    "fields": [Jeu, Voiture, Circuit, Date],
    "footer": "Par amour du spin — Sim Racing Community"
  }]
}
```
