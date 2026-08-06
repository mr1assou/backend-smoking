-- Optional free-text answers when onboarding step "Other" is selected.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "quitReasonOtherText" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "motivationOtherText" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "priorQuitAttemptsOtherText" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "primaryInterestOtherText" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nicotineOtherText" TEXT;
