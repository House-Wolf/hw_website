-- CreateTable
CREATE TABLE "command_operations" (
    "id" UUID NOT NULL,
    "guildId" TEXT NOT NULL,
    "creatorId" UUID NOT NULL,
    "managerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "input" JSONB NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "requestKey" TEXT NOT NULL,
    "nativeEventId" TEXT,
    "nativeSnapshot" JSONB,
    "remoteSnapshot" JSONB,
    "syncState" TEXT NOT NULL DEFAULT 'CLEAN',
    "announcementId" TEXT,
    "announcementChannelId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "command_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_deliveries" (
    "id" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "actorId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMPTZ(6),
    "leaseToken" TEXT,
    "sendingAt" TIMESTAMPTZ(6),
    "errorCode" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_signups" (
    "operationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "preferences" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "command_signups_pkey" PRIMARY KEY ("operationId","userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "command_operations_nativeEventId_key" ON "command_operations"("nativeEventId");

-- CreateIndex
CREATE INDEX "command_operations_guildId_state_updatedAt_idx" ON "command_operations"("guildId", "state", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "command_operations_guildId_creatorId_requestKey_key" ON "command_operations"("guildId", "creatorId", "requestKey");

-- CreateIndex
CREATE INDEX "command_deliveries_status_availableAt_leaseUntil_idx" ON "command_deliveries"("status", "availableAt", "leaseUntil");

-- CreateIndex
CREATE UNIQUE INDEX "command_deliveries_operationId_revision_kind_key" ON "command_deliveries"("operationId", "revision", "kind");

-- AddForeignKey
ALTER TABLE "command_operations" ADD CONSTRAINT "command_operations_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_deliveries" ADD CONSTRAINT "command_deliveries_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_signups" ADD CONSTRAINT "command_signups_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_signups" ADD CONSTRAINT "command_signups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "command_deliveries" ADD CONSTRAINT "command_deliveries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "command_operations" ADD CONSTRAINT "command_operation_state_check" CHECK (state IN ('DRAFT','PUBLISHED','ACTIVE','COMPLETED','CANCELLED','ARCHIVED') AND revision > 0);
ALTER TABLE "command_operations" ADD CONSTRAINT "command_operation_sync_check" CHECK ("syncState" IN ('CLEAN','CONFLICT','DELETED'));
ALTER TABLE "command_deliveries" ADD CONSTRAINT "command_delivery_status_check" CHECK (status IN ('PENDING','PROCESSING','POSTED','FAILED','BLOCKED','AMBIGUOUS','SUPERSEDED') AND kind IN ('NATIVE','ANNOUNCEMENT') AND attempts >= 0 AND revision > 0);
ALTER TABLE "command_signups" ADD CONSTRAINT "command_signup_status_check" CHECK (status IN ('COMMITTED','TENTATIVE','RESERVE','WITHDRAWN'));
