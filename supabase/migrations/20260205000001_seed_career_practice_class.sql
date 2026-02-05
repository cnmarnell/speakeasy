-- Migration: Configure Career Practice class for auto-enrollment
-- Created: 2026-02-05
-- Purpose: Ensure Career Practice class is owned by Sarah Johnson + add enrollment RLS

-- Update Career Practice class to be owned by Sarah Johnson
-- Class ID: dce3fac8-e730-4979-a68d-f01ee51d68fb
-- Teacher ID: d3d70418-0540-4401-a415-6a43f1ceeb1a
UPDATE classes 
SET teacher_id = 'd3d70418-0540-4401-a415-6a43f1ceeb1a'
WHERE id = 'dce3fac8-e730-4979-a68d-f01ee51d68fb';

-- Add RLS policy to allow students to enroll themselves in classes
-- This is needed for the auto-enrollment feature
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

-- Log success
DO $$
DECLARE
  class_name_val VARCHAR(255);
  teacher_name_val VARCHAR(255);
BEGIN
  SELECT c.name, t.name 
  INTO class_name_val, teacher_name_val
  FROM classes c
  JOIN teachers t ON c.teacher_id = t.id
  WHERE c.id = 'dce3fac8-e730-4979-a68d-f01ee51d68fb';
  
  RAISE NOTICE 'Career Practice configured - Class: %, Owner: %', class_name_val, teacher_name_val;
END $$;
