ALTER TABLE "posts"
ADD COLUMN "moderated_at" TIMESTAMPTZ(3),
ADD COLUMN "moderated_by_id" INTEGER;

ALTER TABLE "posts"
ADD CONSTRAINT "posts_moderated_by_id_fkey"
FOREIGN KEY ("moderated_by_id") REFERENCES "users"("user_id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "posts_moderated_at_idx" ON "posts"("moderated_at");
