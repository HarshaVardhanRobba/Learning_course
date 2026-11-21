CREATE TYPE "public"."lesson_content_format" AS ENUM('markdown', 'rich_text');--> statement-breakpoint
CREATE TYPE "public"."lesson_resource_kind" AS ENUM('link', 'file');--> statement-breakpoint
CREATE TABLE "lesson_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"kind" "lesson_resource_kind" NOT NULL,
	"url" text,
	"r2_key" text,
	CONSTRAINT "lesson_resources_target_check" CHECK (("lesson_resources"."kind" = 'link' and "lesson_resources"."url" is not null and "lesson_resources"."r2_key" is null) or ("lesson_resources"."kind" = 'file' and "lesson_resources"."r2_key" is not null and "lesson_resources"."url" is null))
);
--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "content_format" "lesson_content_format" DEFAULT 'markdown' NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "video_uid" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "lesson_resources" ADD CONSTRAINT "lesson_resources_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_resources_lesson_position_unique" ON "lesson_resources" USING btree ("lesson_id","position");