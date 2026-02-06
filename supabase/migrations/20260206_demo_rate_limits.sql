-- Migration: Add demo rate limiting table
-- Created: 2026-02-06
-- Purpose: Track IP-based rate limits for demo users

CREATE TABLE IF NOT EXISTS demo_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  recording_count INTEGER DEFAULT 0,
  first_recording_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_recording_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  window_start DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast IP lookups
CREATE INDEX IF NOT EXISTS idx_demo_rate_limits_ip ON demo_rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_demo_rate_limits_window ON demo_rate_limits(ip_address, window_start);

-- Create a unique constraint on IP + window for upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_demo_rate_limits_ip_window_unique 
  ON demo_rate_limits(ip_address, window_start);

-- Create demo student if not exists
-- Using a fixed UUID so this is idempotent
INSERT INTO students (id, name, email)
VALUES (
  '00000000-0000-0000-0000-000000000demo',
  'Demo User',
  'demo@speakeasy.app'
)
ON CONFLICT (email) DO NOTHING;

-- Allow anonymous access for demo rate limiting
ALTER TABLE demo_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous read for demo rate limits"
  ON demo_rate_limits FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert for demo rate limits"
  ON demo_rate_limits FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow anonymous update for demo rate limits"
  ON demo_rate_limits FOR UPDATE
  USING (true);

COMMENT ON TABLE demo_rate_limits IS 'Tracks rate limits for demo/unauthenticated users by IP address';
