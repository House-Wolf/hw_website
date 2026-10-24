-- AlterTable
ALTER TABLE "command_operations" ADD COLUMN     "crewRevision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "command_ships" (
    "id" UUID NOT NULL,
    "guildId" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "externalRef" TEXT,
    "availability" TEXT NOT NULL DEFAULT 'UNAVAILABLE',
    "readiness" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "productionState" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "verifiedAt" TIMESTAMPTZ(6),
    "verifiedById" UUID,
    "evidence" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "command_ships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_operation_ships" (
    "id" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "shipId" UUID NOT NULL,
    "consentAt" TIMESTAMPTZ(6),
    "consentById" UUID,

    CONSTRAINT "command_operation_ships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_seats" (
    "id" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "operationShipId" UUID,
    "label" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "requiredCode" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "command_seats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_crew_assignments" (
    "id" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "seatId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMPTZ(6),
    "releaseReason" TEXT,

    CONSTRAINT "command_crew_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_qualifications" (
    "id" UUID NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "issuerId" UUID NOT NULL,
    "evidence" TEXT NOT NULL,
    "issuedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "revokeReason" TEXT,

    CONSTRAINT "command_qualifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "command_ships_guildId_ownerId_idx" ON "command_ships"("guildId", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "command_ships_guildId_externalRef_key" ON "command_ships"("guildId", "externalRef");

-- CreateIndex
CREATE INDEX "command_operation_ships_shipId_idx" ON "command_operation_ships"("shipId");

-- CreateIndex
CREATE UNIQUE INDEX "command_operation_ships_operationId_shipId_key" ON "command_operation_ships"("operationId", "shipId");

-- CreateIndex
CREATE UNIQUE INDEX "command_operation_ships_id_operationId_key" ON "command_operation_ships"("id", "operationId");

-- CreateIndex
CREATE UNIQUE INDEX "command_seats_id_operationId_key" ON "command_seats"("id", "operationId");

-- CreateIndex
CREATE UNIQUE INDEX "command_seats_operationId_label_key" ON "command_seats"("operationId", "label");

-- CreateIndex
CREATE INDEX "command_crew_assignments_userId_releasedAt_idx" ON "command_crew_assignments"("userId", "releasedAt");

-- CreateIndex
CREATE INDEX "command_crew_assignments_operationId_releasedAt_idx" ON "command_crew_assignments"("operationId", "releasedAt");

-- CreateIndex
CREATE INDEX "command_qualifications_guildId_userId_code_idx" ON "command_qualifications"("guildId", "userId", "code");

-- AddForeignKey
ALTER TABLE "command_ships" ADD CONSTRAINT "command_ships_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_ships" ADD CONSTRAINT "command_ships_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_operation_ships" ADD CONSTRAINT "command_operation_ships_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_operation_ships" ADD CONSTRAINT "command_operation_ships_shipId_fkey" FOREIGN KEY ("shipId") REFERENCES "command_ships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_operation_ships" ADD CONSTRAINT "command_operation_ships_consentById_fkey" FOREIGN KEY ("consentById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_seats" ADD CONSTRAINT "command_seats_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_seats" ADD CONSTRAINT "command_seats_operationShipId_operationId_fkey" FOREIGN KEY ("operationShipId", "operationId") REFERENCES "command_operation_ships"("id", "operationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_crew_assignments" ADD CONSTRAINT "command_crew_assignments_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "command_operations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_crew_assignments" ADD CONSTRAINT "command_crew_assignments_seatId_operationId_fkey" FOREIGN KEY ("seatId", "operationId") REFERENCES "command_seats"("id", "operationId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_crew_assignments" ADD CONSTRAINT "command_crew_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_crew_assignments" ADD CONSTRAINT "command_crew_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_qualifications" ADD CONSTRAINT "command_qualifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_qualifications" ADD CONSTRAINT "command_qualifications_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Active occupancy is enforced independently of application checks.
CREATE UNIQUE INDEX "command_crew_active_seat_key" ON "command_crew_assignments"("seatId") WHERE "releasedAt" IS NULL;
CREATE UNIQUE INDEX "command_crew_active_member_operation_key" ON "command_crew_assignments"("operationId", "userId") WHERE "releasedAt" IS NULL;
CREATE UNIQUE INDEX "command_qualification_active_key" ON "command_qualifications"("guildId", "userId", "code") WHERE "revokedAt" IS NULL;
ALTER TABLE "command_ships" ADD CONSTRAINT "command_ship_values_check" CHECK ("capacity" BETWEEN 1 AND 100 AND "revision">0 AND "availability" IN ('AVAILABLE','UNAVAILABLE') AND "readiness" IN ('READY','MAINTENANCE','UNKNOWN') AND "productionState" IN ('FLIGHT_READY','CONCEPT','UNKNOWN'));
ALTER TABLE "command_operation_ships" ADD CONSTRAINT "command_ship_consent_pair_check" CHECK (("consentAt" IS NULL) = ("consentById" IS NULL));
ALTER TABLE "command_crew_assignments" ADD CONSTRAINT "command_crew_release_pair_check" CHECK (("releasedAt" IS NULL) = ("releaseReason" IS NULL));
ALTER TABLE "command_operations" ADD CONSTRAINT "command_crew_revision_check" CHECK ("crewRevision">=0);
