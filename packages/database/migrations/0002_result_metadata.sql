ALTER TABLE "completed_tests" ADD COLUMN "mode" varchar(20) DEFAULT 'timer';-->statement-breakpoint
ALTER TABLE "completed_tests" ADD COLUMN "test_type" varchar(30) DEFAULT 'text';-->statement-breakpoint
ALTER TABLE "completed_tests" ADD COLUMN "mode_target" integer;-->statement-breakpoint
ALTER TABLE "completed_tests" ADD COLUMN "exercise_pack_id" varchar(100);-->statement-breakpoint
ALTER TABLE "completed_tests" ADD COLUMN "exercise_kind" varchar(50);-->statement-breakpoint
UPDATE "completed_tests" SET "mode" = 'timer' WHERE "mode" IS NULL;-->statement-breakpoint
UPDATE "completed_tests" SET "test_type" = 'text' WHERE "test_type" IS NULL;-->statement-breakpoint
CREATE INDEX IF NOT EXISTS "completed_tests_mode_type_idx" ON "completed_tests" USING btree ("mode","test_type");
