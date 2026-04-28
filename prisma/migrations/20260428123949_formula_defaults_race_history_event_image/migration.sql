-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "discordId" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "game" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "car" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "GuildConfig" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "guildId" TEXT NOT NULL,
    "webhookUrl" TEXT NOT NULL,
    "adminRoleId" TEXT,
    "configuredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "discordUsername" TEXT,
    "discordId" TEXT,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "money" INTEGER NOT NULL DEFAULT 0,
    "reputation" INTEGER NOT NULL DEFAULT 50,
    "licensePoints" INTEGER NOT NULL DEFAULT 0,
    "totalRaces" INTEGER NOT NULL DEFAULT 0,
    "finishedRaces" INTEGER NOT NULL DEFAULT 0,
    "cleanRaces" INTEGER NOT NULL DEFAULT 0,
    "teamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Player_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LicenseConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "minXp" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#CD7F32',
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "PlayerCategory" (
    "playerId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    PRIMARY KEY ("playerId", "categoryId"),
    CONSTRAINT "PlayerCategory_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RaceSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "durationMin" INTEGER NOT NULL,
    "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedBy" TEXT NOT NULL,
    "trackVenue" TEXT,
    "trackEvent" TEXT,
    "sessionType" TEXT,
    "warningThreshold" INTEGER NOT NULL DEFAULT 4,
    "sanctionThreshold" INTEGER NOT NULL DEFAULT 8
);

-- CreateTable
CREATE TABLE "RaceResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "raceSessionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "xpGained" INTEGER NOT NULL,
    "moneyGained" INTEGER NOT NULL,
    "isClean" BOOLEAN NOT NULL DEFAULT true,
    "carClass" TEXT,
    "incidents" INTEGER NOT NULL DEFAULT 0,
    "reputationDelta" INTEGER NOT NULL DEFAULT 0,
    "ladderDelta" INTEGER NOT NULL DEFAULT 0,
    "laps" INTEGER,
    "bestLapTimeSec" REAL,
    "finishStatus" TEXT,
    "teamName" TEXT,
    CONSTRAINT "RaceResult_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RaceResult_raceSessionId_fkey" FOREIGN KEY ("raceSessionId") REFERENCES "RaceSession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerClassStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "carClass" TEXT NOT NULL,
    "classXp" INTEGER NOT NULL DEFAULT 0,
    "ladderPoints" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PlayerClassStats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FormulaDefaults" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "finishBonus" REAL NOT NULL DEFAULT 10,
    "positionBase" REAL NOT NULL DEFAULT 10,
    "positionMultiplier" REAL NOT NULL DEFAULT 1.5,
    "podiumP1" REAL NOT NULL DEFAULT 10,
    "podiumP2" REAL NOT NULL DEFAULT 7,
    "podiumP3" REAL NOT NULL DEFAULT 5,
    "incidentMalusPct" REAL NOT NULL DEFAULT 2,
    "incidentMalusCap" REAL NOT NULL DEFAULT 20,
    "moneyBasePerMin" REAL NOT NULL DEFAULT 50,
    "coeffCourse" REAL NOT NULL DEFAULT 1,
    "organizerSharePct" REAL NOT NULL DEFAULT 25,
    "p1PrizePct" REAL NOT NULL DEFAULT 10,
    "pLastMinPct" REAL NOT NULL DEFAULT 25,
    "repDelta_01" REAL NOT NULL DEFAULT 3,
    "repDelta_2" REAL NOT NULL DEFAULT 1,
    "repDelta_3" REAL NOT NULL DEFAULT -1,
    "repDelta_4plus" REAL NOT NULL DEFAULT -3,
    "repFinishBonus" REAL NOT NULL DEFAULT 1,
    "ladderCoeff_sm" REAL NOT NULL DEFAULT 4,
    "ladderCoeff_md" REAL NOT NULL DEFAULT 3,
    "ladderCoeff_lg" REAL NOT NULL DEFAULT 2,
    "warningIncidentThresh" INTEGER NOT NULL DEFAULT 4,
    "sanctionIncidentThresh" INTEGER NOT NULL DEFAULT 8,
    "forceThreshold" INTEGER NOT NULL DEFAULT 1500
);

-- CreateTable
CREATE TABLE "TwitchStreamer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Team_name_key" ON "Team"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Player_username_key" ON "Player"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Player_discordId_key" ON "Player"("discordId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerClassStats_playerId_carClass_key" ON "PlayerClassStats"("playerId", "carClass");

-- CreateIndex
CREATE UNIQUE INDEX "TwitchStreamer_username_key" ON "TwitchStreamer"("username");
