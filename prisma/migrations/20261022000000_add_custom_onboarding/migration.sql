CREATE TABLE "onboarding_profiles" (
    "user_id" UUID NOT NULL,
    "interests" TEXT[] NOT NULL,
    "other_game" TEXT,
    "rules_version" TEXT NOT NULL,
    "rules_accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "welcome_message_id" TEXT,
    "welcome_claimed_at" TIMESTAMPTZ(6),
    "welcome_last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "onboarding_profiles_pkey" PRIMARY KEY ("user_id")
);

CREATE INDEX "onboarding_profiles_completed_at_welcome_message_id_idx" ON "onboarding_profiles"("completed_at", "welcome_message_id");

ALTER TABLE "onboarding_profiles" ADD CONSTRAINT "onboarding_profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
