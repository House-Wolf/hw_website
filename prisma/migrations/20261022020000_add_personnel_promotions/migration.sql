CREATE TABLE "personnel_members" (
  "id" UUID NOT NULL, "guild_id" TEXT NOT NULL, "discord_id" TEXT NOT NULL, "rsi_handle" TEXT,
  "application_accepted_at" TIMESTAMPTZ(6), "membership_confirmed_at" TIMESTAMPTZ(6), "membership_verified_by" TEXT, "membership_evidence" TEXT,
  "current_rank_role_id" TEXT, "rank_since" TIMESTAMPTZ(6), "rank_source" TEXT, "rsi_checked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "personnel_members_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "personnel_members_guild_id_discord_id_key" ON "personnel_members"("guild_id", "discord_id");
CREATE UNIQUE INDEX "personnel_members_guild_id_rsi_handle_key" ON "personnel_members"("guild_id", "rsi_handle");

CREATE TABLE "promotion_requests" (
  "id" UUID NOT NULL, "member_id" UUID NOT NULL, "source_rank_role_id" TEXT NOT NULL, "target_rank_role_id" TEXT NOT NULL,
  "rank_since" TIMESTAMPTZ(6) NOT NULL, "eligible_at" TIMESTAMPTZ(6) NOT NULL, "approvals_required" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REVIEW', "threshold_at" TIMESTAMPTZ(6), "execute_after" TIMESTAMPTZ(6),
  "vetoed_by" TEXT, "completed_at" TIMESTAMPTZ(6),
  "officer_message_id" TEXT, "announcement_message_id" TEXT, "processing_token" TEXT, "processing_until" TIMESTAMPTZ(6), "last_error" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "promotion_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promotion_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "personnel_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "promotion_requests_member_id_source_rank_role_id_rank_since_key" ON "promotion_requests"("member_id", "source_rank_role_id", "rank_since");
CREATE INDEX "promotion_requests_status_execute_after_idx" ON "promotion_requests"("status", "execute_after");

CREATE TABLE "promotion_votes" (
  "request_id" UUID NOT NULL, "voter_discord_id" TEXT NOT NULL, "decision" TEXT NOT NULL, "is_veto" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "promotion_votes_pkey" PRIMARY KEY ("request_id", "voter_discord_id"),
  CONSTRAINT "promotion_votes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "promotion_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "personnel_commands" (
  "id" UUID NOT NULL, "guild_id" TEXT NOT NULL, "key" TEXT NOT NULL, "name" TEXT NOT NULL, "command_role_id" TEXT NOT NULL,
  "allowed_role_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "captain_discord_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "personnel_commands_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "personnel_commands_guild_id_key_key" ON "personnel_commands"("guild_id", "key");

CREATE TABLE "personnel_audits" (
  "id" UUID NOT NULL, "guild_id" TEXT NOT NULL, "actor_discord_id" TEXT, "member_discord_id" TEXT NOT NULL, "request_id" UUID,
  "action" TEXT NOT NULL, "details" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "personnel_audits_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "personnel_audits_guild_id_member_discord_id_created_at_idx" ON "personnel_audits"("guild_id", "member_discord_id", "created_at");
