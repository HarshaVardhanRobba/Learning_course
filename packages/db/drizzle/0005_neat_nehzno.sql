CREATE TABLE "streams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "streams_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
-- Hand-edited: rename the enum value in place instead of drizzle-kit's drop/recreate, which cannot cast existing 'career_path' rows.
ALTER TYPE "public"."course_kind" RENAME VALUE 'career_path' TO 'track';--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "stream_id" uuid;--> statement-breakpoint
ALTER TABLE "topics" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_foundation_has_no_stream" CHECK ("courses"."kind" <> 'foundation' or "courses"."stream_id" is null);