-- Attempt economics segments (habit settings frozen per time window)

CREATE TABLE "attempt_economics_segments" (
    "segment_id" SERIAL NOT NULL,
    "attempt_id" INTEGER NOT NULL,
    "effective_from" TIMESTAMPTZ(3) NOT NULL,
    "cigarettes_per_day" INTEGER NOT NULL,
    "cigarettes_per_pack" INTEGER NOT NULL,
    "pack_price" TEXT,

    CONSTRAINT "attempt_economics_segments_pkey" PRIMARY KEY ("segment_id")
);

CREATE INDEX "attempt_economics_segments_attempt_id_effective_from_idx"
ON "attempt_economics_segments"("attempt_id", "effective_from");

ALTER TABLE "attempt_economics_segments"
ADD CONSTRAINT "attempt_economics_segments_attempt_id_fkey"
FOREIGN KEY ("attempt_id") REFERENCES "quit_attempts"("attempt_id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one segment per existing attempt from current user habit fields
INSERT INTO "attempt_economics_segments" (
    "attempt_id",
    "effective_from",
    "cigarettes_per_day",
    "cigarettes_per_pack",
    "pack_price"
)
SELECT
    qa."attempt_id",
    qa."started_at",
    COALESCE(u."cigarettesPerDay", 0),
    COALESCE(u."cigarettesPerPack", 20),
    u."packPrice"
FROM "quit_attempts" qa
JOIN "users" u ON u."user_id" = qa."user_id";
