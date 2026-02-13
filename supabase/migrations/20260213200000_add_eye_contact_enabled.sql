-- Add eye_contact_enabled toggle to assignments table
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS eye_contact_enabled BOOLEAN DEFAULT false;
