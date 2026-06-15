-- CreateTable
CREATE TABLE "chat_threads" (
    "thread_id" SERIAL NOT NULL,
    "user_one_id" INTEGER NOT NULL,
    "user_two_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "chat_threads_pkey" PRIMARY KEY ("thread_id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "message_id" SERIAL NOT NULL,
    "thread_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "text" TEXT,
    "media_url" TEXT,
    "media_mime_type" TEXT,
    "media_duration_ms" INTEGER,
    "media_size_bytes" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateTable
CREATE TABLE "chat_thread_reads" (
    "thread_read_id" SERIAL NOT NULL,
    "thread_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "last_read_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_thread_reads_pkey" PRIMARY KEY ("thread_read_id")
);

-- CreateIndex
CREATE INDEX "chat_threads_user_one_id_idx" ON "chat_threads"("user_one_id");

-- CreateIndex
CREATE INDEX "chat_threads_user_two_id_idx" ON "chat_threads"("user_two_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_threads_user_one_id_user_two_id_key" ON "chat_threads"("user_one_id", "user_two_id");

-- CreateIndex
CREATE INDEX "chat_messages_thread_id_created_at_idx" ON "chat_messages"("thread_id", "created_at" ASC);

-- CreateIndex
CREATE INDEX "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");

-- CreateIndex
CREATE INDEX "chat_thread_reads_user_id_idx" ON "chat_thread_reads"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_thread_reads_thread_id_user_id_key" ON "chat_thread_reads"("thread_id", "user_id");

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_user_one_id_fkey" FOREIGN KEY ("user_one_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_user_two_id_fkey" FOREIGN KEY ("user_two_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("thread_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_thread_reads" ADD CONSTRAINT "chat_thread_reads_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "chat_threads"("thread_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_thread_reads" ADD CONSTRAINT "chat_thread_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce canonical pair ordering so each user pair has exactly one thread row.
ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_user_one_lt_user_two" CHECK ("user_one_id" < "user_two_id");

-- Allowed message payloads: plain text or R2-backed media.
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_message_type_check" CHECK ("message_type" IN ('text', 'image', 'video', 'audio'));
