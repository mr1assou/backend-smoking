-- Comment replies, votes, and engagement counters
ALTER TABLE "post_comments" ADD COLUMN "parent_comment_id" INTEGER;
ALTER TABLE "post_comments" ADD COLUMN "reply_to_user_id" INTEGER;
ALTER TABLE "post_comments" ADD COLUMN "upvote_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "post_comments" ADD COLUMN "downvote_count" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_comment_id_fkey"
  FOREIGN KEY ("parent_comment_id") REFERENCES "post_comments"("comment_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_reply_to_user_id_fkey"
  FOREIGN KEY ("reply_to_user_id") REFERENCES "users"("user_id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "post_comments_post_id_parent_comment_id_created_at_idx"
  ON "post_comments"("post_id", "parent_comment_id", "created_at");

CREATE TABLE "post_comment_votes" (
  "comment_vote_id" SERIAL NOT NULL,
  "comment_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "vote" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "post_comment_votes_pkey" PRIMARY KEY ("comment_vote_id")
);

CREATE UNIQUE INDEX "post_comment_votes_comment_id_user_id_key"
  ON "post_comment_votes"("comment_id", "user_id");

CREATE INDEX "post_comment_votes_user_id_idx" ON "post_comment_votes"("user_id");

ALTER TABLE "post_comment_votes" ADD CONSTRAINT "post_comment_votes_comment_id_fkey"
  FOREIGN KEY ("comment_id") REFERENCES "post_comments"("comment_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "post_comment_votes" ADD CONSTRAINT "post_comment_votes_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
