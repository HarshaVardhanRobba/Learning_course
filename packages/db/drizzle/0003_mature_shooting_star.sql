CREATE TYPE "public"."review_decision" AS ENUM('approved', 'rejected');--> statement-breakpoint
CREATE TABLE "application_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"reviewer_id" uuid,
	"decision" "review_decision" NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "application_reviews_application_id_unique" UNIQUE("application_id"),
	CONSTRAINT "application_reviews_rejection_reason_check" CHECK (("application_reviews"."decision" = 'rejected' and "application_reviews"."rejection_reason" is not null and length(trim("application_reviews"."rejection_reason")) > 0)
        or ("application_reviews"."decision" = 'approved' and "application_reviews"."rejection_reason" is null))
);
--> statement-breakpoint
ALTER TABLE "applications" DROP CONSTRAINT "applications_reviewed_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_reviews" ADD CONSTRAINT "application_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "reviewed_at";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "reviewed_by";--> statement-breakpoint
ALTER TABLE "applications" DROP COLUMN "rejection_reason";