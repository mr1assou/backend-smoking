-- AlterTable: make tag_id nullable to support pre-import assets without RFID tags
ALTER TABLE "assets" ALTER COLUMN "tag_id" DROP NOT NULL;
