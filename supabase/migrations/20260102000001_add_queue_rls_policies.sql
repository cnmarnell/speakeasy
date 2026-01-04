-- Add RLS policies for submission_queue to allow authenticated users to insert/delete
-- This fixes the issue where queue inserts were being silently blocked

-- Allow any authenticated user to insert queue items
-- (The submission_id foreign key ensures the submission exists)
CREATE POLICY "Users can insert queue items" ON submission_queue
  FOR INSERT
  WITH CHECK (true);

-- Allow any authenticated user to delete queue items
-- (Needed for resubmissions that clear old queue entries)
CREATE POLICY "Users can delete queue items" ON submission_queue
  FOR DELETE
  USING (true);
