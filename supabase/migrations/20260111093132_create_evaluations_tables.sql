-- Migration: Create evaluations and evaluation_scores tables
-- Created: 2026-01-11
-- Purpose: Store structured evaluation results for rubric-based grading

-- Create evaluations table
CREATE TABLE IF NOT EXISTS evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  transcript TEXT NOT NULL,
  total_score INTEGER NOT NULL DEFAULT 0,
  max_total_score INTEGER NOT NULL DEFAULT 0,
  overall_feedback TEXT,
  improvement_suggestions TEXT,
  is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
  raw_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create evaluation_scores table
CREATE TABLE IF NOT EXISTS evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES rubric_criteria(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_evaluations_student_id ON evaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_rubric_id ON evaluations(rubric_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_created_at ON evaluations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluation_id ON evaluation_scores(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_criterion_id ON evaluation_scores(criterion_id);

-- Enable RLS on evaluations table
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;

-- Allow viewing evaluations (students see their own, teachers see all)
CREATE POLICY "Users can view evaluations" ON evaluations
  FOR SELECT
  USING (true);

-- Allow inserting evaluations
CREATE POLICY "Users can create evaluations" ON evaluations
  FOR INSERT
  WITH CHECK (true);

-- Allow updating evaluations
CREATE POLICY "Users can update evaluations" ON evaluations
  FOR UPDATE
  USING (true);

-- Allow deleting evaluations
CREATE POLICY "Users can delete evaluations" ON evaluations
  FOR DELETE
  USING (true);

-- Enable RLS on evaluation_scores table
ALTER TABLE evaluation_scores ENABLE ROW LEVEL SECURITY;

-- Allow viewing evaluation scores
CREATE POLICY "Users can view evaluation scores" ON evaluation_scores
  FOR SELECT
  USING (true);

-- Allow inserting evaluation scores
CREATE POLICY "Users can create evaluation scores" ON evaluation_scores
  FOR INSERT
  WITH CHECK (true);

-- Allow updating evaluation scores
CREATE POLICY "Users can update evaluation scores" ON evaluation_scores
  FOR UPDATE
  USING (true);

-- Allow deleting evaluation scores
CREATE POLICY "Users can delete evaluation scores" ON evaluation_scores
  FOR DELETE
  USING (true);

-- Comments for documentation
COMMENT ON TABLE evaluations IS 'Stores evaluation results from rubric-based grading';
COMMENT ON COLUMN evaluations.student_id IS 'The student whose response was evaluated';
COMMENT ON COLUMN evaluations.rubric_id IS 'The rubric used for evaluation';
COMMENT ON COLUMN evaluations.transcript IS 'The student response that was evaluated';
COMMENT ON COLUMN evaluations.total_score IS 'Total score achieved across all criteria';
COMMENT ON COLUMN evaluations.max_total_score IS 'Maximum possible score for this rubric';
COMMENT ON COLUMN evaluations.is_fallback IS 'True if structured parsing failed and raw_response contains unstructured feedback';
COMMENT ON COLUMN evaluations.raw_response IS 'Raw LLM response when structured parsing fails';
COMMENT ON TABLE evaluation_scores IS 'Individual criterion scores within an evaluation';
COMMENT ON COLUMN evaluation_scores.score IS 'Score achieved for this criterion';
COMMENT ON COLUMN evaluation_scores.max_score IS 'Maximum points possible for this criterion';
COMMENT ON COLUMN evaluation_scores.feedback IS 'Criterion-specific feedback text';
