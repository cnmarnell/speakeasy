-- Allow authenticated users to read from classes table
-- This fixes the 406 error when creating assignments (class lookup was blocked)

-- Enable RLS on classes if not already enabled
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read classes
CREATE POLICY "Authenticated users can read classes" ON classes
  FOR SELECT
  USING (auth.role() = 'authenticated');
