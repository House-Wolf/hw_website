-- CreateTable
CREATE TABLE "marketplace_guests" (
    "id" SERIAL NOT NULL,
    "discord_user_id" TEXT NOT NULL,
    "discord_tag" TEXT,
    "guild_id" TEXT NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "warning_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "marketplace_guests_pkey" PRIMARY KEY ("id")
);
