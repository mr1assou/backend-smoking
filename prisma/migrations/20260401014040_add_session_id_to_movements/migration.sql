-- AlterTable
ALTER TABLE "asset_movements" ADD COLUMN     "session_id" UUID;

-- CreateIndex
CREATE INDEX "asset_movements_session_id_idx" ON "asset_movements"("session_id");

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inventory_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
