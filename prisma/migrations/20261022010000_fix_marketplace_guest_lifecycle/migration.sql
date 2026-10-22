ALTER TABLE "marketplace_guests"
    ADD COLUMN "warning_sent_at" TIMESTAMPTZ(6),
    ADD COLUMN "warning_attempted_at" TIMESTAMPTZ(6),
    ADD COLUMN "warning_unavailable" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "next_check_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN "processing_until" TIMESTAMPTZ(6),
    ADD COLUMN "processing_token" TEXT,
    ADD COLUMN "last_error" TEXT;

CREATE INDEX "marketplace_guests_guild_id_next_check_at_idx" ON "marketplace_guests"("guild_id", "next_check_at");
