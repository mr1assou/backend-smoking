CREATE TABLE "quit_attempts" (
    "attempt_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "end_outcome" TEXT,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "cigarettes_avoided" INTEGER NOT NULL DEFAULT 0,
    "money_saved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "life_minutes_gained" INTEGER NOT NULL DEFAULT 0,
    "slip_cigarettes_smoked" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quit_attempts_pkey" PRIMARY KEY ("attempt_id")
);

CREATE UNIQUE INDEX "quit_attempts_user_id_attempt_number_key" ON "quit_attempts"("user_id", "attempt_number");

ALTER TABLE "quit_attempts" ADD CONSTRAINT "quit_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "slip_events" ADD COLUMN "previous_quit_date" TIMESTAMPTZ(3);
ALTER TABLE "slip_events" ADD COLUMN "closed_attempt_id" INTEGER;
ALTER TABLE "slip_events" ADD COLUMN "new_attempt_id" INTEGER;

ALTER TABLE "slip_events" ADD CONSTRAINT "slip_events_closed_attempt_id_fkey" FOREIGN KEY ("closed_attempt_id") REFERENCES "quit_attempts"("attempt_id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "slip_events" ADD CONSTRAINT "slip_events_new_attempt_id_fkey" FOREIGN KEY ("new_attempt_id") REFERENCES "quit_attempts"("attempt_id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "slip_events_closed_attempt_id_key" ON "slip_events"("closed_attempt_id");

INSERT INTO "quit_attempts" ("user_id", "attempt_number", "started_at", "ended_at")
SELECT "user_id", 1, COALESCE("streakStart", "quitDate"), NULL
FROM "users"
WHERE "quitDate" IS NOT NULL;
