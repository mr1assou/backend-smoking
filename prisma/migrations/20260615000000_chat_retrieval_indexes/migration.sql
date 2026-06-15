-- Chat retrieval indexes for high-volume message storage.
-- Aligns with: thread message pagination, unread counts, and inbox sorting.

-- Messages: newest-first pagination within a thread (replaces ASC index).
DROP INDEX IF EXISTS "chat_messages_thread_id_created_at_idx";
CREATE INDEX "chat_messages_thread_id_created_at_idx"
  ON "chat_messages"("thread_id", "created_at" DESC);

-- Messages: unread count — filter by thread + exclude self + created_at cursor.
CREATE INDEX "chat_messages_thread_id_sender_id_created_at_idx"
  ON "chat_messages"("thread_id", "sender_id", "created_at" DESC);

-- Messages: optional filter/reporting by payload type.
CREATE INDEX "chat_messages_message_type_idx"
  ON "chat_messages"("message_type");

-- Threads: inbox list sorted by recent activity per participant.
CREATE INDEX "chat_threads_user_one_id_updated_at_idx"
  ON "chat_threads"("user_one_id", "updated_at" DESC);

CREATE INDEX "chat_threads_user_two_id_updated_at_idx"
  ON "chat_threads"("user_two_id", "updated_at" DESC);
