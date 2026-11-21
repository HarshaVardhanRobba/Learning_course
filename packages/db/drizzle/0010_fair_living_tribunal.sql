CREATE TYPE "public"."badge_visibility" AS ENUM('visible', 'hidden');--> statement-breakpoint
ALTER TABLE "user_badges" DROP CONSTRAINT "user_badges_enrollment_id_enrollments_id_fk";
--> statement-breakpoint
DROP INDEX "user_badges_user_badge_unique";--> statement-breakpoint
ALTER TABLE "user_badges" ALTER COLUMN "enrollment_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "badges" ADD COLUMN "how_to_earn" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "badges" ADD COLUMN "visibility" "badge_visibility" DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_badge_attempt_unique" ON "user_badges" USING btree ("user_id","badge_id","enrollment_id");