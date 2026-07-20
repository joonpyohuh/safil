-- Outcome tracking: actual posts + selected vs discarded options
ALTER TABLE generations
  ADD COLUMN IF NOT EXISTS posted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS posted_at BIGINT,
  ADD COLUMN IF NOT EXISTS discarded_indices JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_generations_posted_created
  ON generations (posted, created_at DESC);
