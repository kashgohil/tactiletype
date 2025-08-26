CREATE TABLE IF NOT EXISTS "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(50) NOT NULL,
	"criteria" text NOT NULL,
	"badge_icon" varchar(100),
	"points" integer DEFAULT 0,
	"rarity" varchar(20) DEFAULT 'common',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "error_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_result_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"character_errors" text NOT NULL,
	"word_errors" text NOT NULL,
	"error_patterns" text NOT NULL,
	"most_problematic_chars" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "keystroke_analytics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_result_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"keystroke_data" text NOT NULL,
	"avg_keystroke_time" numeric(8, 3),
	"keystroke_variance" numeric(8, 3),
	"typing_rhythm" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "multiplayer_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"host_id" uuid NOT NULL,
	"test_text_id" uuid NOT NULL,
	"max_players" integer DEFAULT 10,
	"status" varchar(20) DEFAULT 'waiting',
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "oauth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_id" varchar(255) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "performance_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"timeframe" varchar(20) NOT NULL,
	"date" timestamp NOT NULL,
	"avg_wpm" numeric(5, 2),
	"avg_accuracy" numeric(5, 2),
	"test_count" integer DEFAULT 0,
	"total_time_spent" integer DEFAULT 0,
	"improvement_rate" numeric(5, 2),
	"consistency_score" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "practice_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"focus_area" varchar(50) NOT NULL,
	"target_content" text,
	"session_data" text NOT NULL,
	"duration" integer NOT NULL,
	"improvement_score" numeric(5, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "room_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"final_wpm" numeric(5, 2),
	"final_accuracy" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"test_text_id" uuid NOT NULL,
	"wpm" numeric(5, 2) NOT NULL,
	"accuracy" numeric(5, 2) NOT NULL,
	"errors" integer DEFAULT 0,
	"time_taken" integer NOT NULL,
	"keystroke_data" text,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "test_texts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"language" varchar(10) DEFAULT 'en',
	"difficulty" varchar(20) DEFAULT 'medium',
	"word_count" integer NOT NULL,
	"created_by" uuid,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"achievement_id" uuid NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"progress" numeric(5, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_type" varchar(50) NOT NULL,
	"target_value" numeric(8, 2) NOT NULL,
	"current_value" numeric(8, 2) DEFAULT '0',
	"target_date" timestamp,
	"is_active" boolean DEFAULT true,
	"is_achieved" boolean DEFAULT false,
	"achieved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(100),
	"bio" text,
	"country" varchar(2),
	"keyboard" varchar(100),
	"preferred_language" varchar(10) DEFAULT 'en',
	"is_public" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"action_data" text,
	"priority" integer DEFAULT 1,
	"is_read" boolean DEFAULT false,
	"is_applied" boolean DEFAULT false,
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(50) NOT NULL,
	"password_hash" varchar(255),
	"avatar_url" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "error_analytics" ADD CONSTRAINT "error_analytics_test_result_id_test_results_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_results"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "error_analytics" ADD CONSTRAINT "error_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "keystroke_analytics" ADD CONSTRAINT "keystroke_analytics_test_result_id_test_results_id_fk" FOREIGN KEY ("test_result_id") REFERENCES "public"."test_results"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "keystroke_analytics" ADD CONSTRAINT "keystroke_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "multiplayer_rooms" ADD CONSTRAINT "multiplayer_rooms_host_id_users_id_fk" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "multiplayer_rooms" ADD CONSTRAINT "multiplayer_rooms_test_text_id_test_texts_id_fk" FOREIGN KEY ("test_text_id") REFERENCES "public"."test_texts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "performance_insights" ADD CONSTRAINT "performance_insights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_room_id_multiplayer_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."multiplayer_rooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_participants" ADD CONSTRAINT "room_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_results" ADD CONSTRAINT "test_results_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_results" ADD CONSTRAINT "test_results_test_text_id_test_texts_id_fk" FOREIGN KEY ("test_text_id") REFERENCES "public"."test_texts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "test_texts" ADD CONSTRAINT "test_texts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_goals" ADD CONSTRAINT "user_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_recommendations" ADD CONSTRAINT "user_recommendations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "achievements_category_idx" ON "achievements" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "achievements_rarity_idx" ON "achievements" USING btree ("rarity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "error_analytics_user_idx" ON "error_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "error_analytics_test_result_idx" ON "error_analytics" USING btree ("test_result_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "keystroke_analytics_user_idx" ON "keystroke_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "keystroke_analytics_test_result_idx" ON "keystroke_analytics" USING btree ("test_result_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "rooms_status_idx" ON "multiplayer_rooms" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauth_user_provider_idx" ON "oauth_accounts" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_insights_user_date_idx" ON "performance_insights" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "performance_insights_timeframe_idx" ON "performance_insights" USING btree ("timeframe");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "practice_sessions_user_idx" ON "practice_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "practice_sessions_focus_idx" ON "practice_sessions" USING btree ("focus_area");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "practice_sessions_created_idx" ON "practice_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "room_participants_room_user_idx" ON "room_participants" USING btree ("room_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_results_user_completed_idx" ON "test_results" USING btree ("user_id","completed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_results_wpm_idx" ON "test_results" USING btree ("wpm");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "test_texts_lang_diff_idx" ON "test_texts" USING btree ("language","difficulty");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievements_user_idx" ON "user_achievements" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievements_achievement_idx" ON "user_achievements" USING btree ("achievement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_achievements_user_achievement_idx" ON "user_achievements" USING btree ("user_id","achievement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_goals_user_active_idx" ON "user_goals" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_goals_type_idx" ON "user_goals" USING btree ("goal_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_recommendations_user_idx" ON "user_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_recommendations_type_idx" ON "user_recommendations" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_recommendations_priority_idx" ON "user_recommendations" USING btree ("priority");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_username_idx" ON "users" USING btree ("username");