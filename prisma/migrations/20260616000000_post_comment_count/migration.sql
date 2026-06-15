-- Denormalized comment counter for fast feed reads (source of truth remains post_comments).
ALTER TABLE "posts" ADD COLUMN "comment_count" INTEGER NOT NULL DEFAULT 0;

UPDATE "posts" p
SET "comment_count" = (
  SELECT COUNT(*)::int FROM "post_comments" c WHERE c."post_id" = p."post_id"
);

CREATE INDEX "posts_comment_count_idx" ON "posts"("comment_count" DESC);
CREATE INDEX "posts_upvote_count_created_at_idx" ON "posts"("upvote_count" DESC, "created_at" DESC);
