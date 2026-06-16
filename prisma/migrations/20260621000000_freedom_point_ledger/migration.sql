-- CreateTable
CREATE TABLE "freedom_point_ledger" (
    "ledger_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_key" TEXT NOT NULL,
    "earned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "freedom_point_ledger_pkey" PRIMARY KEY ("ledger_id")
);

-- CreateIndex
CREATE INDEX "freedom_point_ledger_user_id_earned_at_idx" ON "freedom_point_ledger"("user_id", "earned_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "freedom_point_ledger_user_id_source_type_source_key_key" ON "freedom_point_ledger"("user_id", "source_type", "source_key");

-- AddForeignKey
ALTER TABLE "freedom_point_ledger" ADD CONSTRAINT "freedom_point_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
