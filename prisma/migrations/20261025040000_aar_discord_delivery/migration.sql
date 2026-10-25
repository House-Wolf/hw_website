CREATE TABLE "command_aar_deliveries" (
  "id" UUID PRIMARY KEY,
  "operationId" UUID NOT NULL UNIQUE REFERENCES "command_debriefs"("operationId") ON DELETE RESTRICT,
  "reviewRevision" INTEGER NOT NULL CHECK ("reviewRevision" > 0),
  "reviewedAt" TIMESTAMPTZ(6) NOT NULL,
  "actorId" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','PROCESSING','POSTED','BLOCKED','FAILED','AMBIGUOUS','SUPERSEDED')),
  "attempts" INTEGER NOT NULL DEFAULT 0 CHECK ("attempts" >= 0),
  "availableAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseUntil" TIMESTAMPTZ(6), "leaseToken" TEXT, "sendingAt" TIMESTAMPTZ(6),
  "channelId" TEXT, "messageId" TEXT, "errorCode" TEXT,
  CONSTRAINT "aar_message_channel" CHECK ("messageId" IS NULL OR "channelId" IS NOT NULL)
);
CREATE INDEX "command_aar_deliveries_status_availableAt_leaseUntil_idx" ON "command_aar_deliveries"("status","availableAt","leaseUntil");
