CREATE TABLE meta_demographic_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL REFERENCES meta_ad_accounts(account_id),
  campaign_id text,
  campaign_name text NOT NULL,
  date date NOT NULL,
  age text,
  gender text,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  results integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(account_id, campaign_name, date, age, gender)
);

CREATE TABLE meta_placement_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL REFERENCES meta_ad_accounts(account_id),
  campaign_id text,
  campaign_name text NOT NULL,
  date date NOT NULL,
  publisher_platform text,
  platform_position text,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  results integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(account_id, campaign_name, date, publisher_platform, platform_position)
);

CREATE TABLE meta_geo_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL REFERENCES meta_ad_accounts(account_id),
  campaign_id text,
  campaign_name text NOT NULL,
  date date NOT NULL,
  country text,
  region text,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  results integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(account_id, campaign_name, date, country, region)
);

CREATE TABLE meta_hourly_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id text NOT NULL REFERENCES meta_ad_accounts(account_id),
  campaign_id text,
  campaign_name text NOT NULL,
  date date NOT NULL,
  hour integer,
  spend numeric DEFAULT 0,
  impressions integer DEFAULT 0,
  clicks integer DEFAULT 0,
  results integer DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  fetched_at timestamptz DEFAULT now(),
  UNIQUE(account_id, campaign_name, date, hour)
);
