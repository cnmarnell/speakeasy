-- Migration: Add prompt_key and Elevator Pitch rubric
-- Created: 2026-02-07

-- Add prompt_key column to rubrics (links to file-based rubric definitions)
ALTER TABLE rubrics ADD COLUMN IF NOT EXISTS prompt_key TEXT UNIQUE;

-- Update CAR Framework with its prompt_key
UPDATE rubrics SET prompt_key = 'car_framework' WHERE name = 'CAR Framework';

-- Insert Elevator Pitch rubric
INSERT INTO rubrics (name, description, context, prompt_key, is_system)
VALUES (
  'Elevator Pitch',
  '30-60 second pitch for networking, career fairs, or investor meetings',
  'Evaluate how effectively the speaker introduces themselves and their value proposition in a brief, compelling way.',
  'elevator_pitch',
  true
);

-- Insert Elevator Pitch criteria
DO $$
DECLARE
  pitch_rubric_id UUID;
BEGIN
  SELECT id INTO pitch_rubric_id FROM rubrics WHERE prompt_key = 'elevator_pitch';
  
  INSERT INTO rubric_criteria (rubric_id, name, description, max_points, sort_order) VALUES
  (pitch_rubric_id, 'Hook', 'Opening that grabs attention in the first 5-10 seconds', 1, 1),
  (pitch_rubric_id, 'Clarity', 'Easy to understand what you do - no jargon', 1, 2),
  (pitch_rubric_id, 'Value Proposition', 'Clear problem being solved or value created', 1, 3),
  (pitch_rubric_id, 'Credibility', 'Evidence of capability, traction, or experience', 1, 4),
  (pitch_rubric_id, 'Call to Action', 'Clear next step for the listener', 1, 5);
END $$;
