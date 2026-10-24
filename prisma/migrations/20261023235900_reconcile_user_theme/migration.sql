-- Existing application field was present in schema but absent from migration history.
-- Idempotent for installations that previously added this column through db push.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "theme_preference" TEXT DEFAULT 'night';
