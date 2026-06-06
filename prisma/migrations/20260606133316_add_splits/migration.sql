/*
  Warnings:

  - You are about to drop the column `car` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `repDelta_01` on the `FormulaDefaults` table. All the data in the column will be lost.
  - You are about to drop the column `repDelta_2` on the `FormulaDefaults` table. All the data in the column will be lost.
  - You are about to drop the column `repDelta_3` on the `FormulaDefaults` table. All the data in the column will be lost.
  - You are about to drop the column `repDelta_4plus` on the `FormulaDefaults` table. All the data in the column will be lost.
  - You are about to drop the column `sanctionIncidentThresh` on the `FormulaDefaults` table. All the data in the column will be lost.
  - You are about to drop the column `warningIncidentThresh` on the `FormulaDefaults` table. All the data in the column will be lost.
  - You are about to alter the column `forceThreshold` on the `FormulaDefaults` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Float`.
  - Added the required column `cars` to the `Event` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RaceResult" ADD COLUMN "avertCount" INTEGER;
ALTER TABLE "RaceResult" ADD COLUMN "contactCount" INTEGER;
ALTER TABLE "RaceResult" ADD COLUMN "offtrackCount" INTEGER;
ALTER TABLE "RaceResult" ADD COLUMN "sanctionCount" INTEGER;

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carClass" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Split" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "serverName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    CONSTRAINT "Split_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SplitEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "splitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carClass" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "discordId" TEXT,
    CONSTRAINT "SplitEntry_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "Split" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RaceHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "track" TEXT NOT NULL,
    "image" TEXT,
    "rawResults" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    CONSTRAINT "RaceHistory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConstructorStandings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carClass" TEXT NOT NULL,
    "constructorName" TEXT NOT NULL,
    "seasonPoints" INTEGER NOT NULL DEFAULT 0,
    "raceCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TrackRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "carClass" TEXT NOT NULL,
    "circuit" TEXT NOT NULL,
    "constructorName" TEXT NOT NULL,
    "piloteName" TEXT NOT NULL,
    "bestLapTime" REAL NOT NULL,
    "raceDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TickerItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "game" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "cars" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "serverName" TEXT,
    "serverPassword" TEXT,
    "serverBase" TEXT,
    "passwordBase" TEXT,
    "closeOffsetHours" INTEGER NOT NULL DEFAULT 2,
    "registrationsClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL
);
INSERT INTO "new_Event" ("createdAt", "createdById", "date", "description", "game", "id", "imageUrl", "title", "track", "updatedAt") SELECT "createdAt", "createdById", "date", "description", "game", "id", "imageUrl", "title", "track", "updatedAt" FROM "Event";
DROP TABLE "Event";
ALTER TABLE "new_Event" RENAME TO "Event";
CREATE TABLE "new_FormulaDefaults" (
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
    "repBase" REAL NOT NULL DEFAULT 3,
    "repFinishBonus" REAL NOT NULL DEFAULT 1,
    "offtrackPenalty" REAL NOT NULL DEFAULT 0.25,
    "contactPenalty" REAL NOT NULL DEFAULT 1,
    "avertPenalty" REAL NOT NULL DEFAULT 1,
    "sanctionPenalty" REAL NOT NULL DEFAULT 2,
    "avertRatioMin" REAL NOT NULL DEFAULT 2,
    "sanctionRatioMin" REAL NOT NULL DEFAULT 4,
    "forceThreshold" REAL NOT NULL DEFAULT 800,
    "forceRatioMin" REAL NOT NULL DEFAULT 1.05,
    "ladderCoeff_sm" REAL NOT NULL DEFAULT 4,
    "ladderCoeff_md" REAL NOT NULL DEFAULT 3,
    "ladderCoeff_lg" REAL NOT NULL DEFAULT 2
);
INSERT INTO "new_FormulaDefaults" ("coeffCourse", "finishBonus", "forceThreshold", "id", "incidentMalusCap", "incidentMalusPct", "ladderCoeff_lg", "ladderCoeff_md", "ladderCoeff_sm", "moneyBasePerMin", "organizerSharePct", "p1PrizePct", "pLastMinPct", "podiumP1", "podiumP2", "podiumP3", "positionBase", "positionMultiplier", "repFinishBonus") SELECT "coeffCourse", "finishBonus", "forceThreshold", "id", "incidentMalusCap", "incidentMalusPct", "ladderCoeff_lg", "ladderCoeff_md", "ladderCoeff_sm", "moneyBasePerMin", "organizerSharePct", "p1PrizePct", "pLastMinPct", "podiumP1", "podiumP2", "podiumP3", "positionBase", "positionMultiplier", "repFinishBonus" FROM "FormulaDefaults";
DROP TABLE "FormulaDefaults";
ALTER TABLE "new_FormulaDefaults" RENAME TO "FormulaDefaults";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Split_eventId_index_key" ON "Split"("eventId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "ConstructorStandings_carClass_constructorName_key" ON "ConstructorStandings"("carClass", "constructorName");

-- CreateIndex
CREATE UNIQUE INDEX "TrackRecord_carClass_circuit_key" ON "TrackRecord"("carClass", "circuit");
