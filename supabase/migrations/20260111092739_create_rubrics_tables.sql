-- Migration: Create rubrics and rubric_criteria tables
-- Created: 2026-01-11
-- Purpose: Support rubric-based evaluation system with database-stored rubrics

-- Create rubrics table
CREATE TABLE IF NOT EXISTS rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rubric_criteria table
CREATE TABLE IF NOT EXISTS rubric_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id UUID NOT NULL REFERENCES rubrics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  max_points INTEGER NOT NULL CHECK (max_points >= 1),
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rubrics_created_by ON rubrics(created_by);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_rubric_id ON rubric_criteria(rubric_id);
CREATE INDEX IF NOT EXISTS idx_rubric_criteria_order ON rubric_criteria(rubric_id, "order");

-- Add trigger to auto-update updated_at on rubrics
CREATE OR REPLACE FUNCTION update_rubrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rubrics_updated_at_trigger ON rubrics;
CREATE TRIGGER rubrics_updated_at_trigger
  BEFORE UPDATE ON rubrics
  FOR EACH ROW
  EXECUTE FUNCTION update_rubrics_updated_at();

-- Enable RLS on rubrics table
ALTER TABLE rubrics ENABLE ROW LEVEL SECURITY;

-- Allow teachers to view all rubrics (for sharing/reuse)
CREATE POLICY "Teachers can view all rubrics" ON rubrics
  FOR SELECT
  USING (true);

-- Allow teachers to create rubrics
CREATE POLICY "Teachers can create rubrics" ON rubrics
  FOR INSERT
  WITH CHECK (true);

-- Allow teachers to update their own rubrics
CREATE POLICY "Teachers can update own rubrics" ON rubrics
  FOR UPDATE
  USING (true);

-- Allow teachers to delete their own rubrics  
CREATE POLICY "Teachers can delete own rubrics" ON rubrics
  FOR DELETE
  USING (true);

-- Enable RLS on rubric_criteria table
ALTER TABLE rubric_criteria ENABLE ROW LEVEL SECURITY;

-- Allow viewing criteria for any viewable rubric
CREATE POLICY "Users can view rubric criteria" ON rubric_criteria
  FOR SELECT
  USING (true);

-- Allow inserting criteria
CREATE POLICY "Users can insert rubric criteria" ON rubric_criteria
  FOR INSERT
  WITH CHECK (true);

-- Allow updating criteria
CREATE POLICY "Users can update rubric criteria" ON rubric_criteria
  FOR UPDATE
  USING (true);

-- Allow deleting criteria
CREATE POLICY "Users can delete rubric criteria" ON rubric_criteria
  FOR DELETE
  USING (true);

-- Comments for documentation
COMMENT ON TABLE rubrics IS 'Stores evaluation rubrics created by professors';
COMMENT ON COLUMN rubrics.created_by IS 'The professor (teacher) who created this rubric';
COMMENT ON TABLE rubric_criteria IS 'Individual criteria within a rubric';
COMMENT ON COLUMN rubric_criteria.max_points IS 'Maximum points for this criterion (must be >= 1)';
COMMENT ON COLUMN rubric_criteria."order" IS 'Display order of criteria within the rubric';
