-- Add confidence_score column to grades table
-- Stores eye contact confidence as a percentage (0-100)
ALTER TABLE grades ADD COLUMN IF NOT EXISTS confidence_score INTEGER;
