-- Migration: Seed CAR Framework rubric data
-- Created: 2026-01-11
-- Purpose: Add the default CAR (Context, Action, Result) rubric for evaluations

-- Create the CAR Framework rubric
-- Using a fixed UUID so this seed is idempotent
DO $$
DECLARE
  car_rubric_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert the CAR Framework rubric if it doesn't exist
  INSERT INTO rubrics (id, name, description, created_by, created_at, updated_at)
  VALUES (
    car_rubric_id,
    'CAR Framework',
    'Evaluates responses using the Context-Action-Result framework with quantitative data emphasis. Each criterion is worth 1 point for a total of 4 points.',
    NULL, -- System-created, no specific professor
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Insert the 4 criteria for CAR rubric
  -- Context (1 point)
  INSERT INTO rubric_criteria (id, rubric_id, name, description, max_points, "order", created_at)
  VALUES (
    '00000000-0000-0000-0001-000000000001',
    car_rubric_id,
    'Context',
    'Evaluates whether the speaker clearly establishes the background and situation. Look for: the setting, timeframe, relevant circumstances, and why this situation mattered. The context should help the listener understand the challenge or opportunity being addressed.',
    1,
    1,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Action (1 point)
  INSERT INTO rubric_criteria (id, rubric_id, name, description, max_points, "order", created_at)
  VALUES (
    '00000000-0000-0000-0001-000000000002',
    car_rubric_id,
    'Action',
    'Evaluates whether the speaker clearly describes what specific actions they personally took. Look for: concrete steps, decisions made, strategies employed, and the speaker''s individual contribution. Avoid vague statements like "we did things" - focus on specific, measurable actions.',
    1,
    2,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Result (1 point)
  INSERT INTO rubric_criteria (id, rubric_id, name, description, max_points, "order", created_at)
  VALUES (
    '00000000-0000-0000-0001-000000000003',
    car_rubric_id,
    'Result',
    'Evaluates whether the speaker clearly articulates the outcomes of their actions. Look for: what changed, what was achieved, and the impact of their work. Results should be specific and connected to the actions taken.',
    1,
    3,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Quantitative Data (1 point)
  INSERT INTO rubric_criteria (id, rubric_id, name, description, max_points, "order", created_at)
  VALUES (
    '00000000-0000-0000-0001-000000000004',
    car_rubric_id,
    'Quantitative Data',
    'Evaluates whether the speaker includes specific numbers, metrics, or measurable data. Look for: percentages, dollar amounts, timeframes, team sizes, or other concrete figures. Quantitative data makes the story more credible and impactful.',
    1,
    4,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN rubrics.id IS 'Fixed UUID 00000000-0000-0000-0000-000000000001 reserved for CAR Framework rubric';
