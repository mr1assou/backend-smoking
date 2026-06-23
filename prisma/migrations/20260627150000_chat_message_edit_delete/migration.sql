-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "chat_messages" ADD COLUMN "edited_at" TIMESTAMPTZ(3);
