-- EventRegistration
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carClass" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "EventRegistration_eventId_userId_key" ON "EventRegistration"("eventId", "userId");

-- Split
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
CREATE UNIQUE INDEX "Split_eventId_index_key" ON "Split"("eventId", "index");

-- SplitEntry
CREATE TABLE "SplitEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "splitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "carClass" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "discordId" TEXT,
    CONSTRAINT "SplitEntry_splitId_fkey" FOREIGN KEY ("splitId") REFERENCES "Split" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Event : ajout des colonnes splits uniquement
ALTER TABLE "Event" ADD COLUMN "serverBase" TEXT;
ALTER TABLE "Event" ADD COLUMN "passwordBase" TEXT;
ALTER TABLE "Event" ADD COLUMN "closeOffsetHours" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "Event" ADD COLUMN "registrationsClosed" BOOLEAN NOT NULL DEFAULT false;
