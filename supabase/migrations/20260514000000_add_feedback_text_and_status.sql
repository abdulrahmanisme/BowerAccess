-- Add open text feedback and application status tracking to feedback_responses
ALTER TABLE feedback_responses ADD COLUMN application_status TEXT NOT NULL DEFAULT 'unknown';  -- 'applied', 'not_applied', 'in_progress'
ALTER TABLE feedback_responses ADD COLUMN feedback_text TEXT;  -- Open text input from user
ALTER TABLE feedback_responses ADD COLUMN feedback_subtype TEXT;  -- 'experience' or 'friction'
ALTER TABLE feedback_responses ADD COLUMN feedback_duration_ms INTEGER;  -- How long user spent typing
ALTER TABLE feedback_responses ADD COLUMN triggered_delay_ms INTEGER DEFAULT 5000;  -- 5 sec delay before feedback shown
ALTER TABLE feedback_responses ADD COLUMN confirmation_timestamp TIMESTAMPTZ;  -- When application status was confirmed

-- Index for analytics queries
CREATE INDEX idx_feedback_responses_app_status 
ON feedback_responses(application_status);

CREATE INDEX idx_feedback_responses_category_status 
ON feedback_responses(category, application_status);

CREATE INDEX idx_feedback_responses_subtype 
ON feedback_responses(feedback_subtype);
