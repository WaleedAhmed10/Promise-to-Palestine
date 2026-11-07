-- Promise to Palestine: Love Beyond Borders
-- All money is stored as integer minor units (cents) to avoid floating point errors.

CREATE TABLE IF NOT EXISTS campaigns (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  goal_cents    BIGINT NOT NULL CHECK (goal_cents > 0),
  currency      CHAR(3) NOT NULL DEFAULT 'USD',
  -- How funds are allocated, shown on the transparency page: {"food":30,"water":20,...}
  allocation    JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS impact_items (
  id            SERIAL PRIMARY KEY,
  campaign_id   INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  key           TEXT NOT NULL,              -- translation key, e.g. "water"
  amount_cents  BIGINT NOT NULL CHECK (amount_cents > 0),
  icon          TEXT NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  UNIQUE (campaign_id, key)
);

CREATE TABLE IF NOT EXISTS pledges (
  id             SERIAL PRIMARY KEY,
  campaign_id    INT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  donor_name     TEXT,
  email          TEXT NOT NULL,             -- private: never returned by public endpoints
  country        TEXT,
  message        TEXT,
  amount_cents   BIGINT NOT NULL CHECK (amount_cents >= 100),
  currency       CHAR(3) NOT NULL DEFAULT 'USD',
  frequency      TEXT NOT NULL DEFAULT 'once' CHECK (frequency IN ('once','monthly')),
  is_anonymous   BOOLEAN NOT NULL DEFAULT FALSE,
  show_amount    BOOLEAN NOT NULL DEFAULT TRUE,
  is_visible     BOOLEAN NOT NULL DEFAULT TRUE,  -- admin moderation switch for the wall
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','refunded')),
  provider       TEXT,                       -- 'stripe' | 'demo' | 'manual'
  provider_ref   TEXT,
  subscription_id TEXT,                      -- Stripe subscription for monthly pledges
  lang           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS pledges_status_idx ON pledges (campaign_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS pledges_provider_ref_idx ON pledges (provider, provider_ref) WHERE provider_ref IS NOT NULL;

-- Translatable content lives in JSONB maps keyed by language code: {"en":"...","ar":"..."}
CREATE TABLE IF NOT EXISTS stories (
  id            SERIAL PRIMARY KEY,
  slug          TEXT UNIQUE NOT NULL,
  title         JSONB NOT NULL,
  summary       JSONB NOT NULL DEFAULT '{}'::jsonb,
  body          JSONB NOT NULL,
  image_url     TEXT,
  is_published  BOOLEAN NOT NULL DEFAULT TRUE,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admins (
  id             SERIAL PRIMARY KEY,
  email          TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter (
  id          SERIAL PRIMARY KEY,
  email       TEXT UNIQUE NOT NULL,
  lang        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
