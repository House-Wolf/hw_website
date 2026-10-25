ALTER TABLE "command_signups" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'WEBSITE';
ALTER TABLE "command_signups" ADD CONSTRAINT "command_signup_source" CHECK ("source" IN ('WEBSITE', 'DISCORD_INTERESTED'));
