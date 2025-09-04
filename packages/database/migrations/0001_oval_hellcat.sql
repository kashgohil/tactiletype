ALTER TABLE "test_results" RENAME TO "completed_tests";--> statement-breakpoint
ALTER TABLE "error_analytics" RENAME COLUMN "test_result_id" TO "completed_test_id";--> statement-breakpoint
ALTER TABLE "keystroke_analytics" RENAME COLUMN "test_result_id" TO "completed_test_id";--> statement-breakpoint
ALTER TABLE "error_analytics" DROP CONSTRAINT "error_analytics_test_result_id_test_results_id_fk";
--> statement-breakpoint
ALTER TABLE "keystroke_analytics" DROP CONSTRAINT "keystroke_analytics_test_result_id_test_results_id_fk";
--> statement-breakpoint
ALTER TABLE "completed_tests" DROP CONSTRAINT "test_results_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "completed_tests" DROP CONSTRAINT "test_results_test_text_id_test_texts_id_fk";
--> statement-breakpoint
DROP INDEX IF EXISTS "error_analytics_test_result_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "keystroke_analytics_test_result_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "test_results_user_completed_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "test_results_wpm_idx";--> statement-breakpoint
ALTER TABLE "completed_tests" ADD COLUMN "title" varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE "completed_tests" ADD COLUMN "content" text NOT NULL;--> statement-breakpoint
ALTER TABLE "completed_tests" ADD COLUMN "language" varchar(10) DEFAULT 'en';--> statement-breakpoint
ALTER TABLE "completed_tests" ADD COLUMN "difficulty" varchar(20) DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "completed_tests" ADD COLUMN "word_count" integer NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "error_analytics" ADD CONSTRAINT "error_analytics_completed_test_id_completed_tests_id_fk" FOREIGN KEY ("completed_test_id") REFERENCES "public"."completed_tests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "keystroke_analytics" ADD CONSTRAINT "keystroke_analytics_completed_test_id_completed_tests_id_fk" FOREIGN KEY ("completed_test_id") REFERENCES "public"."completed_tests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "completed_tests" ADD CONSTRAINT "completed_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "error_analytics_completed_test_idx" ON "error_analytics" USING btree ("completed_test_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "keystroke_analytics_completed_test_idx" ON "keystroke_analytics" USING btree ("completed_test_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "completed_tests_user_completed_idx" ON "completed_tests" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "completed_tests_wpm_idx" ON "completed_tests" USING btree ("wpm");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "completed_tests_lang_diff_idx" ON "completed_tests" USING btree ("language","difficulty");--> statement-breakpoint
ALTER TABLE "completed_tests" DROP COLUMN IF EXISTS "test_text_id";