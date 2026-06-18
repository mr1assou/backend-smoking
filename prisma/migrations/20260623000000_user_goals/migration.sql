CREATE TABLE "user_goals" (
    "goal_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "target" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    "failed_at" TIMESTAMPTZ(3),
    "failed_reason" TEXT,
    "failed_by_slip_event_id" INTEGER,

    CONSTRAINT "user_goals_pkey" PRIMARY KEY ("goal_id")
);

CREATE UNIQUE INDEX "user_goals_attempt_id_type_key" ON "user_goals"("attempt_id", "type");
CREATE INDEX "user_goals_user_id_status_idx" ON "user_goals"("user_id", "status");

ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "quit_attempts"("attempt_id") ON DELETE CASCADE ON UPDATE CASCADE;
