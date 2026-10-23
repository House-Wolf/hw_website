BEGIN;
CREATE TABLE "discord_activity_states" (
  "guild_id" TEXT PRIMARY KEY,
  "tracking_started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "period_started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "next_report_at" TIMESTAMPTZ(6) NOT NULL
);
CREATE TABLE "discord_member_activity" (
  "guild_id" TEXT NOT NULL,
  "discord_id" TEXT NOT NULL,
  "period_started_at" TIMESTAMPTZ(6) NOT NULL,
  "last_active_at" TIMESTAMPTZ(6) NOT NULL,
  "source" TEXT NOT NULL,
  PRIMARY KEY ("guild_id", "discord_id", "period_started_at")
);
CREATE TABLE "discord_activity_deliveries" (
  "id" UUID PRIMARY KEY,
  "guild_id" TEXT NOT NULL,
  "recipient_id" TEXT NOT NULL,
  "period_started_at" TIMESTAMPTZ(6) NOT NULL,
  "period_ended_at" TIMESTAMPTZ(6) NOT NULL,
  "report" JSONB NOT NULL,
  "sent_at" TIMESTAMPTZ(6),
  "message_id" TEXT,
  "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processing_until" TIMESTAMPTZ(6),
  "processing_token" TEXT,
  "last_error" TEXT
);
CREATE UNIQUE INDEX "discord_activity_deliveries_guild_id_recipient_id_period_en_key"
  ON "discord_activity_deliveries" ("guild_id", "recipient_id", "period_ended_at");
CREATE INDEX "discord_activity_deliveries_guild_id_sent_at_next_attempt_a_idx"
  ON "discord_activity_deliveries" ("guild_id", "sent_at", "next_attempt_at");
COMMIT;
