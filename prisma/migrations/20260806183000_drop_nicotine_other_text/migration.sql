-- Step 6 no longer collects an "Other" free-text answer.
ALTER TABLE "users" DROP COLUMN IF EXISTS "nicotineOtherText";
