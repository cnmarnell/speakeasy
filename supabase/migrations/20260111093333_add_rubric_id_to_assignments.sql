-- Migration: Add rubric_id column to assignments table
-- Created: 2026-01-11
-- Purpose: Link assignments to rubrics for structured evaluation

-- Add rubric_id column (nullable FK to rubrics table)
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS rubric_id UUID REFERENCES rubrics(id) ON DELETE SET NULL;

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_assignments_rubric_id ON assignments(rubric_id);

-- Comment for documentation
COMMENT ON COLUMN assignments.rubric_id IS 'Optional reference to the rubric used for evaluating this assignment';
