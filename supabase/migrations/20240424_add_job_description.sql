-- Migration to add job_description field to opportunities table
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS job_description TEXT;

-- Update the comment to help Postgrest/Supabase pick it up if needed
COMMENT ON COLUMN opportunities.job_description IS 'Full job description for hiring category opportunities.';
