-- Allow multiple historical goals per attempt/type (completed + failed keep their rows).
-- Still only one *active* goal per (attempt_id, type).

DROP INDEX IF EXISTS "user_goals_attempt_id_type_key";

CREATE UNIQUE INDEX "user_goals_attempt_id_type_active_key"
ON "user_goals" ("attempt_id", "type")
WHERE "status" = 'active';

CREATE INDEX IF NOT EXISTS "user_goals_attempt_id_type_idx"
ON "user_goals" ("attempt_id", "type");
