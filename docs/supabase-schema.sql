-- SAFIL Supabase schema (Postgres)
-- Run in Supabase SQL Editor before first deploy.

CREATE TABLE IF NOT EXISTS cafe_profile (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  name TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  concept TEXT NOT NULL DEFAULT '',
  introduction TEXT NOT NULL DEFAULT '',
  menus JSONB NOT NULL DEFAULT '[]'::jsonb,
  tone TEXT NOT NULL DEFAULT 'warm',
  customer_type TEXT NOT NULL DEFAULT '',
  logo_path TEXT,
  photo_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  atmosphere TEXT NOT NULL DEFAULT '',
  vibe_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  research_summary TEXT NOT NULL DEFAULT '',
  research_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  place_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('copy', 'image', 'notice')),
  input JSONB NOT NULL,
  options JSONB NOT NULL,
  selected_index INTEGER,
  copied BOOLEAN NOT NULL DEFAULT FALSE,
  downloaded BOOLEAN NOT NULL DEFAULT FALSE,
  posted BOOLEAN NOT NULL DEFAULT FALSE,
  posted_at BIGINT,
  discarded_indices JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_sample BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_generations_type_created
  ON generations (type, created_at DESC);

-- Storage: create a public bucket named "uploads" in Supabase Dashboard (for photo uploads).
