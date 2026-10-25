-- Authors may approve their own AAR. Preserve approval metadata requirements.
BEGIN;
ALTER TABLE "command_debriefs"
  DROP CONSTRAINT "reviewed_report_requires_independent_review",
  ADD CONSTRAINT "reviewed_report_requires_approval" CHECK (
    "reportState" <> 'REVIEWED' OR (
      "authorId" IS NOT NULL AND "reviewerId" IS NOT NULL
      AND "reviewedAt" IS NOT NULL AND length(trim("summary")) > 0
    )
  );
COMMIT;
