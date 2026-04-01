/*
  Warnings:

  - Made the column `user_id` on table `asset_movements` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "TagClassification" AS ENUM ('EXPECTED', 'UNEXPECTED', 'UNKNOWN');

-- DropForeignKey
ALTER TABLE "asset_movements" DROP CONSTRAINT "asset_movements_user_id_fkey";

-- AlterTable
ALTER TABLE "asset_movements" ALTER COLUMN "user_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "inventory_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "last_scan_at" TIMESTAMP(3),
    "total_scanned" INTEGER NOT NULL DEFAULT 0,
    "total_expected" INTEGER NOT NULL DEFAULT 0,
    "found_count" INTEGER NOT NULL DEFAULT 0,
    "missing_count" INTEGER NOT NULL DEFAULT 0,
    "unexpected_count" INTEGER NOT NULL DEFAULT 0,
    "unknown_count" INTEGER NOT NULL DEFAULT 0,
    "movement_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_tags" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "epc_code" TEXT NOT NULL,
    "asset_id" UUID,
    "classification" "TagClassification" NOT NULL,
    "rssi" INTEGER,
    "scanned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_sessions_user_id_idx" ON "inventory_sessions"("user_id");

-- CreateIndex
CREATE INDEX "inventory_sessions_location_id_idx" ON "inventory_sessions"("location_id");

-- CreateIndex
CREATE INDEX "inventory_sessions_started_at_idx" ON "inventory_sessions"("started_at" DESC);

-- CreateIndex
CREATE INDEX "inventory_tags_session_id_idx" ON "inventory_tags"("session_id");

-- CreateIndex
CREATE INDEX "inventory_tags_asset_id_idx" ON "inventory_tags"("asset_id");

-- CreateIndex
CREATE INDEX "inventory_tags_classification_idx" ON "inventory_tags"("classification");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_tags_session_id_epc_code_key" ON "inventory_tags"("session_id", "epc_code");

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_sessions" ADD CONSTRAINT "inventory_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_sessions" ADD CONSTRAINT "inventory_sessions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_tags" ADD CONSTRAINT "inventory_tags_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "inventory_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_tags" ADD CONSTRAINT "inventory_tags_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
