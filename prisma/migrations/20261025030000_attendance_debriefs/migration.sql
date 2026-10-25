CREATE TABLE "command_debriefs" (
  "operationId" UUID PRIMARY KEY REFERENCES "command_operations"("id") ON DELETE RESTRICT,
  "revision" INTEGER NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "finalizedAt" TIMESTAMPTZ(6),
  "summary" TEXT NOT NULL DEFAULT '', "privateNotes" TEXT NOT NULL DEFAULT '',
  "reportState" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("reportState" IN ('DRAFT','REVIEWED')),
  "authorId" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
  "reviewerId" UUID REFERENCES "users"("id") ON DELETE RESTRICT,
  "reviewedAt" TIMESTAMPTZ(6),
  CONSTRAINT "reviewed_report_requires_independent_review" CHECK ("reportState" <> 'REVIEWED' OR ("authorId" IS NOT NULL AND "reviewerId" IS NOT NULL AND "authorId" <> "reviewerId" AND "reviewedAt" IS NOT NULL AND length(trim("summary")) > 0))
);
CREATE TABLE "command_attendance" (
  "operationId" UUID NOT NULL REFERENCES "command_debriefs"("operationId") ON DELETE RESTRICT,
  "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "status" TEXT NOT NULL CHECK ("status" IN ('PRESENT','ABSENT','EXCUSED')),
  "note" TEXT NOT NULL DEFAULT '', PRIMARY KEY ("operationId","userId")
);
CREATE TABLE "command_debrief_revisions" (
  "operationId" UUID NOT NULL REFERENCES "command_debriefs"("operationId") ON DELETE RESTRICT,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "actorId" UUID NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "action" TEXT NOT NULL, "reason" TEXT NOT NULL, "snapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("operationId","revision")
);
