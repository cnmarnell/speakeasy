-- Migration: Add async processing columns to submissions table
-- Created: 2025-12-30
-- Purpose: Support async AI processing with status tracking and polling

-- Add new timestamp columns for tracking processing lifecycle
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add index on status column for efficient polling queries
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- Add index on processing timestamps for analytics queries
CREATE INDEX IF NOT EXISTS idx_submissions_processing_started ON submissions(processing_started_at);

-- Optional: Update existing 'graded' submissions to 'completed' status
-- This maintains backwards compatibility with the new async flow
-- Uncomment the following line if you want to migrate existing data:
-- UPDATE submissions SET status = 'completed' WHERE status = 'graded';

-- Add comment to document the new status flow
COMMENT ON COLUMN submissions.status IS 'Submission status: pending (queued) -> processing (AI running) -> completed (done) or failed (error). Legacy: graded (old sync flow)';
COMMENT ON COLUMN submissions.processing_started_at IS 'Timestamp when background AI processing began';
COMMENT ON COLUMN submissions.processing_completed_at IS 'Timestamp when background AI processing finished (success or failure)';
COMMENT ON COLUMN submissions.error_message IS 'Error message if processing failed';
