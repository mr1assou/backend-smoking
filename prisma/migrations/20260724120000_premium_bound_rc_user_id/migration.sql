-- Bind premium to the Quitify/RevenueCat user who originally paid.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "premium_bound_rc_user_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_premium_bound_rc_user_id_key"
  ON "users"("premium_bound_rc_user_id");
