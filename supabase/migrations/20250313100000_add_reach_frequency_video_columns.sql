-- Add reach, frequency and video metrics to campaign and adset insights

ALTER TABLE meta_campaign_insights
ADD COLUMN IF NOT EXISTS reach integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS frequency numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p25_watched integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p50_watched integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p75_watched integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p100_watched integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_thruplay integer DEFAULT 0;

ALTER TABLE meta_adset_insights
ADD COLUMN IF NOT EXISTS reach integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS frequency numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p25_watched integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p50_watched integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p75_watched integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_p100_watched integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS video_thruplay integer DEFAULT 0;
