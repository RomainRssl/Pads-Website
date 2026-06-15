-- Add trackCapacity and freeSlots to Event
ALTER TABLE "Event" ADD COLUMN "trackCapacity" INTEGER;
ALTER TABLE "Event" ADD COLUMN "freeSlots" INTEGER NOT NULL DEFAULT 0;
