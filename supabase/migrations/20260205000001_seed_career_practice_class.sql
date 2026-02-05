-- Migration: Configure Career Practice class for auto-enrollment
-- Created: 2026-02-05
-- Purpose: Ensure Career Practice class is owned by Sarah Johnson + add enrollment RLS

-- Update Career Practice class to be owned by Sarah Johnson
-- Class ID: c80eec9a-b35f-4035-9ce4-fac22db082f0
-- Teacher ID: 428f3963-51df-409c-8b71-6284a10fbee7
UPDATE classes 
SET teacher_id = '428f3963-51df-409c-8b71-6284a10fbee7'
WHERE id = 'c80eec9a-b35f-4035-9ce4-fac22db082f0';

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
  WHERE c.id = 'c80eec9a-b35f-4035-9ce4-fac22db082f0';
  
  RAISE NOTICE 'Career Practice configured - Class: %, Owner: %', class_name_val, teacher_name_val;
END $$;
