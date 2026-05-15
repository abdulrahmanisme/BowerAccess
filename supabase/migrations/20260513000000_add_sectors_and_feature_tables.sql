-- Phase 1: Add sectors to opportunities table
ALTER TABLE opportunities ADD COLUMN sectors TEXT[] DEFAULT '{}';
CREATE INDEX idx_opportunities_sectors ON opportunities USING GIN(sectors);

-- Phase 1: Create saved_opportunities table (cloud-synced bookmarks)
CREATE TABLE saved_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX idx_saved_opportunities_user ON saved_opportunities(user_id);
CREATE INDEX idx_saved_opportunities_opportunity ON saved_opportunities(opportunity_id);

-- RLS: Users can view and manage their own saved opportunities
ALTER TABLE saved_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved opportunities"
  ON saved_opportunities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can save opportunities"
  ON saved_opportunities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave opportunities"
  ON saved_opportunities FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all saved opportunities"
  ON saved_opportunities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Phase 1: Create feedback_responses table (high-signal category-aware feedback)
CREATE TABLE feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- funding, events, hiring, news, something_new
  feedback_type TEXT NOT NULL, -- e.g., too_senior, stage_mismatch, attended
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_feedback_responses_opportunity ON feedback_responses(opportunity_id);
CREATE INDEX idx_feedback_responses_user ON feedback_responses(user_id);
CREATE INDEX idx_feedback_responses_type ON feedback_responses(feedback_type);
CREATE INDEX idx_feedback_responses_created_at ON feedback_responses(created_at DESC);

-- RLS: Users can view and submit their own feedback
ALTER TABLE feedback_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own feedback"
  ON feedback_responses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can submit feedback"
  ON feedback_responses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
  ON feedback_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Phase 1: Create pending_applications table (application state tracking)
CREATE TABLE pending_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'clicked', -- clicked, applied, abandoned, in_progress
  clicked_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, opportunity_id)
);

CREATE INDEX idx_pending_applications_user ON pending_applications(user_id);
CREATE INDEX idx_pending_applications_status ON pending_applications(status);
CREATE INDEX idx_pending_applications_updated_at ON pending_applications(updated_at DESC);

-- RLS: Users can manage their own pending applications
ALTER TABLE pending_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pending applications"
  ON pending_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert pending applications"
  ON pending_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending applications"
  ON pending_applications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all pending applications"
  ON pending_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
