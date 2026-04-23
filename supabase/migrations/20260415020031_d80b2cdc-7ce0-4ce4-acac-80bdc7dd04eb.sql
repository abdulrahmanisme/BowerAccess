-- Add 'news' to opportunity_category enum
ALTER TYPE public.opportunity_category ADD VALUE IF NOT EXISTS 'news';

-- Add 'page_time' to event_type enum for time tracking
ALTER TYPE public.event_type ADD VALUE IF NOT EXISTS 'page_time';