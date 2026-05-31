-- Migration 001: Add new identification fields to scans table
-- Apply manually in Supabase dashboard > SQL Editor

ALTER TABLE scans
  ADD COLUMN IF NOT EXISTS age_estimate TEXT DEFAULT '—',
  ADD COLUMN IF NOT EXISTS bark_type TEXT DEFAULT '—',
  ADD COLUMN IF NOT EXISTS branching_pattern TEXT DEFAULT '—',
  ADD COLUMN IF NOT EXISTS confidence FLOAT DEFAULT 0.0;
