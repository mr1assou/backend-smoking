-- CreateTable
CREATE TABLE "relax_sounds" (
    "sound_id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "audio_url" TEXT NOT NULL,
    "cover_image_url" TEXT NOT NULL,
    "audio_mime_type" TEXT NOT NULL,
    "duration_ms" INTEGER,
    "size_bytes" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "relax_sounds_pkey" PRIMARY KEY ("sound_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "relax_sounds_slug_key" ON "relax_sounds"("slug");

-- CreateIndex
CREATE INDEX "relax_sounds_is_active_sort_order_idx" ON "relax_sounds"("is_active", "sort_order");
