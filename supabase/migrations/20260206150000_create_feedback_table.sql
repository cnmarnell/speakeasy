-- Create feedback/bug reports table
CREATE TABLE IF NOT EXISTS feedback_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  page_url TEXT,
  page_path TEXT,
  user_email TEXT,
  user_role TEXT,
  browser TEXT,
  screen_size TEXT,
  status TEXT DEFAULT 'new', -- new, reviewed, resolved, closed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feedback_reports ENABLE ROW LEVEL SECURITY;

-- Allow any authenticated user to insert feedback
CREATE POLICY "Users can submit feedback" ON feedback_reports
  FOR INSERT
  WITH CHECK (true);

-- Allow reading own feedback (optional)
CREATE POLICY "Users can view own feedback" ON feedback_reports
  FOR SELECT
  USING (user_email = auth.jwt() ->> 'email');
