CREATE TABLE "plan_day_progress" (
    "progress_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_day" INTEGER NOT NULL,
    "task_states" JSONB NOT NULL DEFAULT '{}',
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "plan_day_progress_pkey" PRIMARY KEY ("progress_id")
);

CREATE UNIQUE INDEX "plan_day_progress_user_id_plan_day_key" ON "plan_day_progress"("user_id", "plan_day");
CREATE INDEX "plan_day_progress_user_id_idx" ON "plan_day_progress"("user_id");

ALTER TABLE "plan_day_progress" ADD CONSTRAINT "plan_day_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
