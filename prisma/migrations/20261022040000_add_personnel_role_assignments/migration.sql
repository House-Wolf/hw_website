BEGIN;

CREATE TABLE "personnel_role_assignments" (
    "id" UUID NOT NULL,
    "guild_id" TEXT NOT NULL,
    "discord_id" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "command_key" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processing_token" TEXT,
    "processing_until" TIMESTAMPTZ(6),
    "next_attempt_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    CONSTRAINT "personnel_role_assignments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "personnel_role_assignments_action_check" CHECK ("action" IN ('ADD', 'REMOVE')),
    CONSTRAINT "personnel_role_assignments_status_check" CHECK ("status" IN ('PENDING', 'EXECUTING', 'RETRY', 'COMPLETED', 'CANCELLED'))
);

CREATE INDEX "personnel_role_assignments_guild_id_status_next_attempt_at_idx"
    ON "personnel_role_assignments"("guild_id", "status", "next_attempt_at");
CREATE INDEX "personnel_role_assignments_guild_id_discord_id_status_idx"
    ON "personnel_role_assignments"("guild_id", "discord_id", "status");

-- Serialize pending changes for each member, including changes to other commands.
-- Prisma cannot express this partial unique index; preserve it in future migrations.
CREATE UNIQUE INDEX "personnel_role_assignments_one_pending_member"
    ON "personnel_role_assignments"("guild_id", "discord_id")
    WHERE "status" IN ('PENDING', 'EXECUTING', 'RETRY');

COMMIT;
