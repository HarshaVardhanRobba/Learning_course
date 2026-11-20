ALTER TABLE "applications" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "last_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "phone" text NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;