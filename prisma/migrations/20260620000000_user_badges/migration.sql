-- CreateTable
CREATE TABLE "user_badges" (
    "user_badge_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "badge_id" TEXT NOT NULL,
    "earned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("user_badge_id")
);

-- CreateIndex
CREATE INDEX "user_badges_user_id_idx" ON "user_badges"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill First Step for existing users
INSERT INTO "user_badges" ("user_id", "badge_id", "earned_at")
SELECT u."user_id", 'first-step', u."createdAt"
FROM "users" u
WHERE NOT EXISTS (
    SELECT 1
    FROM "user_badges" ub
    WHERE ub."user_id" = u."user_id" AND ub."badge_id" = 'first-step'
);
