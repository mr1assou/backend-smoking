-- Add account status (active | blocked)
ALTER TABLE "users" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

-- CreateTable post_reports
CREATE TABLE "post_reports" (
    "report_id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "post_reports_pkey" PRIMARY KEY ("report_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "post_reports_post_id_reporter_id_key" ON "post_reports"("post_id", "reporter_id");

-- CreateIndex
CREATE INDEX "post_reports_post_id_idx" ON "post_reports"("post_id");

-- AddForeignKey
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_reports" ADD CONSTRAINT "post_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
