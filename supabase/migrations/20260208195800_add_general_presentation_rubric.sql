-- Migration: Add General Presentation rubric
-- Created: 2026-02-08

-- Insert General Presentation rubric
INSERT INTO rubrics (name, description, context, prompt_key, is_system)
VALUES (
  'General Presentation',
  'General-purpose rubric for any spoken presentation, talk, or speaking exercise',
  'Evaluate how clearly and effectively the speaker communicates their message in a general presentation context.',
  'general_presentation',
  true
);

-- Insert General Presentation criteria
DO $$
DECLARE
  gp_rubric_id UUID;
BEGIN
  SELECT id INTO gp_rubric_id FROM rubrics WHERE prompt_key = 'general_presentation';
  
  INSERT INTO rubric_criteria (rubric_id, name, description, max_points, sort_order) VALUES
  (gp_rubric_id, 'Clarity & Structure', 'Logical flow, clear intro/body/conclusion, easy to follow', 4, 1),
  (gp_rubric_id, 'Conciseness', 'Makes the point without rambling or going in circles', 4, 2),
  (gp_rubric_id, 'Word Choice', 'Vocabulary is appropriate, specific, and intentional', 4, 3),
  (gp_rubric_id, 'Filler Words', 'Minimizes ums, uhs, likes, you knows', 4, 4),
  (gp_rubric_id, 'Key Takeaway', 'Listener walks away understanding the main point', 4, 5);
END $$;
