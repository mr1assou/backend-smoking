-- Upgrade chat_messages from initial schema (kind + text NOT NULL)
-- to media-capable schema (message_type + optional text + R2 fields).

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages'
      AND column_name = 'kind'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'chat_messages'
      AND column_name = 'message_type'
  ) THEN
    ALTER TABLE "chat_messages" RENAME COLUMN "kind" TO "message_type";
  END IF;
END $$;

ALTER TABLE "chat_messages"
  ADD COLUMN IF NOT EXISTS "message_type" TEXT NOT NULL DEFAULT 'text';

ALTER TABLE "chat_messages"
  ALTER COLUMN "text" DROP NOT NULL;

ALTER TABLE "chat_messages"
  ADD COLUMN IF NOT EXISTS "media_url" TEXT;

ALTER TABLE "chat_messages"
  ADD COLUMN IF NOT EXISTS "media_mime_type" TEXT;

ALTER TABLE "chat_messages"
  ADD COLUMN IF NOT EXISTS "media_duration_ms" INTEGER;

ALTER TABLE "chat_messages"
  ADD COLUMN IF NOT EXISTS "media_size_bytes" INTEGER;

UPDATE "chat_messages"
SET "message_type" = 'text'
WHERE "message_type" IS NULL
   OR "message_type" NOT IN ('text', 'image', 'video', 'audio');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chat_messages_message_type_check'
  ) THEN
    ALTER TABLE "chat_messages"
      ADD CONSTRAINT "chat_messages_message_type_check"
      CHECK ("message_type" IN ('text', 'image', 'video', 'audio'));
  END IF;
END $$;
