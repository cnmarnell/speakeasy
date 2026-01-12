-- Migration: Drop all rubric-related tables and columns
-- Created: 2026-01-12
-- Purpose: Remove rubric functionality from the application

-- Drop rubric-related tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS evaluation_scores CASCADE;
DROP TABLE IF EXISTS evaluations CASCADE;
DROP TABLE IF EXISTS rubric_criteria CASCADE;
DROP TABLE IF EXISTS rubrics CASCADE;

-- Remove rubric_id column from assignments table
ALTER TABLE assignments DROP COLUMN IF EXISTS rubric_id;
