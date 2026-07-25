-- Persist VIP flag (was in schema but never migrated on fresh DBs).
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_premium" BOOLEAN NOT NULL DEFAULT false;
