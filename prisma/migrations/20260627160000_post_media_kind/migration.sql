ALTER TABLE "posts"
ADD COLUMN "media_kind" TEXT DEFAULT 'image',
ADD COLUMN "media_duration_ms" INTEGER;
