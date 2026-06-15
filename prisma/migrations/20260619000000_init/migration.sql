-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "users" (
    "user_id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "hashedRefreshToken" TEXT,
    "quitReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "motivation" TEXT,
    "priorQuitAttempts" TEXT,
    "primaryInterests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "username" TEXT,
    "sex" TEXT,
    "country" TEXT,
    "countryFlag" TEXT,
    "currency" TEXT,
    "quitDatePreset" TEXT,
    "quitDate" TIMESTAMPTZ(3),
    "streakStart" TIMESTAMPTZ(3),
    "cigarettesPerDay" INTEGER,
    "cigarettesPerDayNote" TEXT,
    "packPrice" TEXT,
    "yearsSmoking" TEXT,
    "cigarettesPerPack" INTEGER,
    "timezone" TEXT,
    "image_url" TEXT,
    "last_offline_at" TIMESTAMPTZ(3),
    "freedom_points" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "quit_attempts" (
    "attempt_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "end_outcome" TEXT,
    "duration_seconds" INTEGER NOT NULL DEFAULT 0,
    "cigarettes_avoided" INTEGER NOT NULL DEFAULT 0,
    "money_saved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "life_minutes_gained" INTEGER NOT NULL DEFAULT 0,
    "slip_cigarettes_smoked" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quit_attempts_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateTable
CREATE TABLE "slip_events" (
    "slip_event_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "cigarettesCount" INTEGER,
    "previousStreakStart" TIMESTAMPTZ(3),
    "previous_quit_date" TIMESTAMPTZ(3),
    "closed_attempt_id" INTEGER,
    "new_attempt_id" INTEGER,
    "loggedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slip_events_pkey" PRIMARY KEY ("slip_event_id")
);

-- CreateTable
CREATE TABLE "posts" (
    "post_id" SERIAL NOT NULL,
    "author_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tag_id" TEXT,
    "image_url" TEXT,
    "image_frame" TEXT,
    "image_crop" JSONB,
    "upvote_count" INTEGER NOT NULL DEFAULT 0,
    "downvote_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "comment_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("post_id")
);

-- CreateTable
CREATE TABLE "post_comments" (
    "comment_id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "parent_comment_id" INTEGER,
    "reply_to_user_id" INTEGER,
    "text" TEXT NOT NULL,
    "upvote_count" INTEGER NOT NULL DEFAULT 0,
    "downvote_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "post_comments_pkey" PRIMARY KEY ("comment_id")
);

-- CreateTable
CREATE TABLE "post_comment_votes" (
    "comment_vote_id" SERIAL NOT NULL,
    "comment_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "vote" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "post_comment_votes_pkey" PRIMARY KEY ("comment_vote_id")
);

-- CreateTable
CREATE TABLE "post_votes" (
    "post_vote_id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "vote" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "post_votes_pkey" PRIMARY KEY ("post_vote_id")
);

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
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "quit_attempts_user_id_attempt_number_key" ON "quit_attempts"("user_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "slip_events_closed_attempt_id_key" ON "slip_events"("closed_attempt_id");

-- CreateIndex
CREATE INDEX "slip_events_user_id_loggedAt_idx" ON "slip_events"("user_id", "loggedAt");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "posts_author_id_created_at_idx" ON "posts"("author_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "post_comments_post_id_created_at_idx" ON "post_comments"("post_id", "created_at" ASC);

-- CreateIndex
CREATE INDEX "post_comments_post_id_parent_comment_id_created_at_idx" ON "post_comments"("post_id", "parent_comment_id", "created_at" ASC);

-- CreateIndex
CREATE INDEX "post_comments_author_id_idx" ON "post_comments"("author_id");

-- CreateIndex
CREATE INDEX "post_comment_votes_user_id_idx" ON "post_comment_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_comment_votes_comment_id_user_id_key" ON "post_comment_votes"("comment_id", "user_id");

-- CreateIndex
CREATE INDEX "post_votes_user_id_idx" ON "post_votes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "post_votes_post_id_user_id_key" ON "post_votes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_threads_user_one_id_idx" ON "chat_threads"("user_one_id");

-- CreateIndex
CREATE INDEX "chat_threads_user_two_id_idx" ON "chat_threads"("user_two_id");

-- CreateIndex
CREATE INDEX "chat_threads_user_one_id_updated_at_idx" ON "chat_threads"("user_one_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "chat_threads_user_two_id_updated_at_idx" ON "chat_threads"("user_two_id", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "chat_threads_user_one_id_user_two_id_key" ON "chat_threads"("user_one_id", "user_two_id");

-- CreateIndex
CREATE INDEX "chat_messages_thread_id_created_at_idx" ON "chat_messages"("thread_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_thread_id_sender_id_created_at_idx" ON "chat_messages"("thread_id", "sender_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_sender_id_idx" ON "chat_messages"("sender_id");

-- CreateIndex
CREATE INDEX "chat_messages_message_type_idx" ON "chat_messages"("message_type");

-- CreateIndex
CREATE INDEX "chat_thread_reads_user_id_idx" ON "chat_thread_reads"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_thread_reads_thread_id_user_id_key" ON "chat_thread_reads"("thread_id", "user_id");

-- AddForeignKey
ALTER TABLE "quit_attempts" ADD CONSTRAINT "quit_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_events" ADD CONSTRAINT "slip_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slip_events" ADD CONSTRAINT "slip_events_closed_attempt_id_fkey" FOREIGN KEY ("closed_attempt_id") REFERENCES "quit_attempts"("attempt_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "post_comments"("comment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_reply_to_user_id_fkey" FOREIGN KEY ("reply_to_user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comment_votes" ADD CONSTRAINT "post_comment_votes_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "post_comments"("comment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_comment_votes" ADD CONSTRAINT "post_comment_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "posts"("post_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_votes" ADD CONSTRAINT "post_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

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
