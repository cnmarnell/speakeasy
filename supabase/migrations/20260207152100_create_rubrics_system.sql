-- Migration: Create Rubrics System
-- Created: 2026-02-07
-- Purpose: Enable dynamic rubric selection for assignments

-- ============================================
-- 1. Create rubrics table
-- ============================================
CREATE TABLE IF NOT EXISTS rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  context TEXT,  -- Background context for the AI grader
  is_system BOOLEAN DEFAULT false,  -- System rubrics can't be deleted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Create rubric_criteria table
-- ============================================
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  max_points INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  examples TEXT,  -- Optional good/bad examples
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric_id ON rubric_criteria(rubric_id);

-- ============================================
-- 3. Add rubric_id to assignments
-- ============================================
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS rubric_id UUID REFERENCES rubrics(id);

-- ============================================
-- 4. Seed CAR Framework as the default rubric
-- ============================================
DO $$
DECLARE
  car_rubric_id UUID;
BEGIN
  -- Insert the CAR Framework rubric
  INSERT INTO rubrics (name, description, context, is_system)
  VALUES (
    'CAR Framework',
    'Context-Action-Result framework for behavioral interview responses',
    'Evaluate responses using the CAR framework: Context (situation background), Action (specific steps taken), and Result (measurable outcomes). Used for behavioral interview questions like "Tell me about a time when..."',
    true
  )
  RETURNING id INTO car_rubric_id;

  -- Insert the 4 criteria
  INSERT INTO rubric_criteria (rubric_id, name, description, max_points, sort_order, examples) VALUES
  (
    car_rubric_id,
    'Context',
    'The first step in the CAR framework. Provides enough background so the story makes sense without drowning in details. Sets the stage like an opening scene.',
    1,
    1,
    'Score 1 if: Includes a REAL situation with specifics (who, what, where, when, or problem faced).
Score 0 if: Generic statements, meta-commentary ("here''s a test"), or no context provided.'
  ),
  (
    car_rubric_id,
    'Action',
    'The heart of the interview answer. Actions reveal thinking, problem-solving, and real-world behavior.',
    1,
    2,
    'Score 1 if: Includes SPECIFIC steps with strong action verbs (led, built, designed, implemented, negotiated). Describes HOW they solved the problem.
Score 0 if: Vague actions ("I worked on it", "we made changes"), intentions without actions, or no actions described.
Example Weak: "We had to improve the reporting process, so changes were made."
Example Strong: "I designed and implemented a new reporting template, reducing turnaround time by 30%."'
  ),
  (
    car_rubric_id,
    'Result',
    'Results make stories memorable and credible. Without them, even strong actions feel incomplete.',
    1,
    3,
    'Score 1 if: Includes CONCRETE outcomes — what changed, what improved, measurable or observable impact.
Score 0 if: Vague outcomes ("it went well"), no outcomes mentioned, or only intentions.
Example Weak: "The campaign went well and got good engagement."
Example Strong: "The campaign boosted engagement by 42% in three weeks, generating 1,200 new signups."'
  ),
  (
    car_rubric_id,
    'Quantitative Data',
    'Strict binary check for numerical evidence. Even small numbers are better than none.',
    1,
    4,
    'Score 1 if: ANY number present — digits OR spelled out (thirty, 50%, two weeks, doubled, cut in half).
Score 0 if: Zero numbers or quantities anywhere in the transcript.'
  );

  RAISE NOTICE 'CAR Framework rubric created with id: %', car_rubric_id;
END $$;

-- ============================================
-- 5. Enable RLS (Row Level Security)
-- ============================================
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read rubrics
CREATE POLICY "Anyone can read rubrics" ON rubrics
  FOR SELECT USING (true);

CREATE POLICY "Anyone can read rubric criteria" ON rubric_criteria
  FOR SELECT USING (true);

-- Only allow insert/update/delete for service role (admin operations)
CREATE POLICY "Service role can manage rubrics" ON rubrics
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage rubric criteria" ON rubric_criteria
  FOR ALL USING (auth.role() = 'service_role');
