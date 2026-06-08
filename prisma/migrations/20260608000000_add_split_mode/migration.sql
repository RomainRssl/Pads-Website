-- Add splitMode to Event
ALTER TABLE Event ADD COLUMN splitMode TEXT NOT NULL DEFAULT 'RANKED';
