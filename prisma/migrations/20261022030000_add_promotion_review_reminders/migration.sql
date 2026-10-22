ALTER TABLE "promotion_requests"
ADD COLUMN "next_review_reminder_at" TIMESTAMPTZ(6),
ADD COLUMN "last_review_reminder_at" TIMESTAMPTZ(6);

CREATE INDEX "promotion_requests_status_next_review_reminder_at_idx"
ON "promotion_requests"("status", "next_review_reminder_at");

UPDATE "promotion_requests" AS request
SET "next_review_reminder_at" = rejection."rejected_at" + CASE
  WHEN request."target_rank_role_id" IN ('1120183152430825532', '1318669443227975710') THEN INTERVAL '6 months'
  ELSE INTERVAL '12 months'
END
FROM (
  SELECT "request_id", MIN("updated_at") AS "rejected_at"
  FROM "promotion_votes"
  WHERE "decision" = 'REJECT' AND "is_veto" = false
  GROUP BY "request_id"
) AS rejection
WHERE request."id" = rejection."request_id"
  AND request."status" = 'REVIEW'
  AND request."vetoed_by" IS NULL
  AND request."target_rank_role_id" IN ('1120183152430825532', '1318669443227975710', '1318668777881211023', '1318669440119734362')
  AND NOT EXISTS (
    SELECT 1 FROM "promotion_votes" AS veto
    WHERE veto."request_id" = request."id" AND veto."decision" = 'REJECT' AND veto."is_veto" = true
  );
