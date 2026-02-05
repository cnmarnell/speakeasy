-- Migration: Create Career Practice class for auto-enrollment
-- Created: 2026-02-05
-- Sarah Johnson Teacher ID: d3d70418-0540-4401-a415-6a43f1ceeb1a

-- Create Career Practice class owned by Sarah Johnson
INSERT INTO classes (name, description, teacher_id)
VALUES (
  'Career Practice',
  'Practice your soft skills with AI-powered feedback. Perfect for job interviews, presentations, and professional communication.',
  'd3d70418-0540-4401-a415-6a43f1ceeb1a'
)
ON CONFLICT DO NOTHING;

-- Add RLS policy to allow students to enroll themselves in classes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'class_enrollments' 
    AND policyname = 'Students can enroll themselves'
  ) THEN
    CREATE POLICY "Students can enroll themselves" ON class_enrollments
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
