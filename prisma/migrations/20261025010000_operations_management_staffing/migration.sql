-- CreateTable
CREATE TABLE "command_operation_plans" (
    "operationId" UUID NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "capacity" INTEGER,
    "waitlistEnabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderMinutes" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "updatedById" UUID NOT NULL,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "command_operation_plans_pkey" PRIMARY KEY ("operationId")
);

-- CreateTable
CREATE TABLE "command_operation_templates" (
    "id" UUID NOT NULL,
    "guildId" TEXT NOT NULL,
    "creatorId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "command_operation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_operation_waitlist" (
    "operationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "queuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_operation_waitlist_pkey" PRIMARY KEY ("operationId","userId")
);

-- CreateTable
CREATE TABLE "command_wings" (
    "id" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "command_wings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_wing_seats" (
    "seatId" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "wingId" UUID NOT NULL,

    CONSTRAINT "command_wing_seats_pkey" PRIMARY KEY ("seatId")
);

-- CreateTable
CREATE TABLE "command_reserve_crew" (
    "id" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "seatId" UUID,
    "wingId" UUID,
    "assignedById" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMPTZ(6),
    "releaseReason" TEXT,

    CONSTRAINT "command_reserve_crew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_series_occurrences" (
    "operationId" UUID NOT NULL,
    "seriesId" UUID NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "intervalDays" INTEGER NOT NULL,

    CONSTRAINT "command_series_occurrences_pkey" PRIMARY KEY ("operationId")
);

-- CreateTable
CREATE TABLE "command_operation_reminders" (
    "id" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "minutes" INTEGER NOT NULL,
    "dueAt" TIMESTAMPTZ(6) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMPTZ(6),
    "leaseToken" TEXT,
    "sendingAt" TIMESTAMPTZ(6),
    "messageId" TEXT,
    "errorCode" TEXT,

    CONSTRAINT "command_operation_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "command_operation_templates_guildId_name_key" ON "command_operation_templates"("guildId", "name");

-- CreateIndex
CREATE INDEX "command_operation_waitlist_operationId_queuedAt_userId_idx" ON "command_operation_waitlist"("operationId", "queuedAt", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "command_wings_id_operationId_key" ON "command_wings"("id", "operationId");

-- CreateIndex
CREATE UNIQUE INDEX "command_wings_operationId_name_key" ON "command_wings"("operationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "command_wing_seats_seatId_operationId_key" ON "command_wing_seats"("seatId", "operationId");

-- CreateIndex
CREATE INDEX "command_reserve_crew_operationId_releasedAt_idx" ON "command_reserve_crew"("operationId", "releasedAt");

-- CreateIndex
CREATE INDEX "command_reserve_crew_userId_releasedAt_idx" ON "command_reserve_crew"("userId", "releasedAt");

-- CreateIndex
CREATE UNIQUE INDEX "command_series_occurrences_seriesId_ordinal_key" ON "command_series_occurrences"("seriesId", "ordinal");

-- CreateIndex
CREATE INDEX "command_operation_reminders_status_dueAt_availableAt_leaseU_idx" ON "command_operation_reminders"("status", "dueAt", "availableAt", "leaseUntil");

-- CreateIndex
CREATE UNIQUE INDEX "command_operation_reminders_operationId_revision_minutes_key" ON "command_operation_reminders"("operationId", "revision", "minutes");

-- AddForeignKey
ALTER TABLE "command_operation_plans" ADD CONSTRAINT "command_operation_plans_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_operation_plans" ADD CONSTRAINT "command_operation_plans_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_operation_templates" ADD CONSTRAINT "command_operation_templates_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_operation_waitlist" ADD CONSTRAINT "command_operation_waitlist_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_operation_waitlist" ADD CONSTRAINT "command_operation_waitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_wings" ADD CONSTRAINT "command_wings_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_wing_seats" ADD CONSTRAINT "command_wing_seats_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_wing_seats" ADD CONSTRAINT "command_wing_seats_seatId_operationId_fkey" FOREIGN KEY ("seatId", "operationId") REFERENCES "command_seats"("id", "operationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_wing_seats" ADD CONSTRAINT "command_wing_seats_wingId_operationId_fkey" FOREIGN KEY ("wingId", "operationId") REFERENCES "command_wings"("id", "operationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_reserve_crew" ADD CONSTRAINT "command_reserve_crew_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_reserve_crew" ADD CONSTRAINT "command_reserve_crew_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_reserve_crew" ADD CONSTRAINT "command_reserve_crew_seatId_operationId_fkey" FOREIGN KEY ("seatId", "operationId") REFERENCES "command_seats"("id", "operationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_reserve_crew" ADD CONSTRAINT "command_reserve_crew_wingId_operationId_fkey" FOREIGN KEY ("wingId", "operationId") REFERENCES "command_wings"("id", "operationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_reserve_crew" ADD CONSTRAINT "command_reserve_crew_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_series_occurrences" ADD CONSTRAINT "command_series_occurrences_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_series_occurrences" ADD CONSTRAINT "command_series_occurrences_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_operation_reminders" ADD CONSTRAINT "command_operation_reminders_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_operation_reminders" ADD CONSTRAINT "command_operation_reminders_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve one active reserve duty per member/operation; retain released history.
CREATE UNIQUE INDEX command_reserve_one_active ON command_reserve_crew ("operationId", "userId") WHERE "releasedAt" IS NULL;
ALTER TABLE command_operation_plans ADD CONSTRAINT command_plan_capacity CHECK (capacity IS NULL OR capacity BETWEEN 1 AND 500);
ALTER TABLE command_operation_reminders ADD CONSTRAINT command_reminder_offset CHECK (minutes BETWEEN 1 AND 10080);
ALTER TABLE command_operation_reminders ADD CONSTRAINT command_reminder_status CHECK (status IN ('PENDING','PROCESSING','POSTED','SUPERSEDED','BLOCKED','FAILED','AMBIGUOUS'));
ALTER TABLE command_series_occurrences ADD CONSTRAINT command_series_bounds CHECK (ordinal BETWEEN 1 AND 12 AND "intervalDays" IN (7,14));
