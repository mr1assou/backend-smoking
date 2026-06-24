-- Drop unused timezone column; app uses device timezone via X-Timezone header.
ALTER TABLE "users" DROP COLUMN IF EXISTS "timezone";
