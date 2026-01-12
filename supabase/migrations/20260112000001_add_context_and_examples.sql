-- Migration: Add context and examples columns
-- Created: 2026-01-12
-- Purpose: Support context in rubrics and examples in criteria for better evaluation prompts

-- US-003: Add examples column to rubric_criteria table
ALTER TABLE rubric_criteria
ADD COLUMN IF NOT EXISTS examples TEXT;

COMMENT ON COLUMN rubric_criteria.examples IS 'Optional examples of good/bad responses for this criterion';

-- US-004: Add context column to rubrics table
ALTER TABLE rubrics
ADD COLUMN IF NOT EXISTS context TEXT;

COMMENT ON COLUMN rubrics.context IS 'Assignment context/background information for the evaluator';
