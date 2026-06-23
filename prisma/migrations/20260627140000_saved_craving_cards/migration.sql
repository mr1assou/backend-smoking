-- AlterTable
ALTER TABLE "users" ADD COLUMN "saved_tip_card_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "users" ADD COLUMN "saved_motivation_card_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
