-- AlterTable
ALTER TABLE "plan_day_progress" ADD COLUMN "task_notes" JSONB NOT NULL DEFAULT '{}';
