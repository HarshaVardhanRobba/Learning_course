CREATE TABLE "assessment_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option_id" uuid,
	"text_answer" text,
	"is_correct" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"correct_count" integer NOT NULL,
	"score_percent" integer NOT NULL,
	"passed" boolean NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessment_attempts_pass_is_full_score" CHECK ("assessment_attempts"."passed" = ("assessment_attempts"."score_percent" = 100))
);
--> statement-breakpoint
CREATE TABLE "assessment_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" "quiz_question_kind" NOT NULL,
	"prompt" text NOT NULL,
	"accepted_answers" text[] DEFAULT '{}'::text[] NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	CONSTRAINT "assessment_questions_answers_by_kind" CHECK (("assessment_questions"."kind" = 'fill_blank' and cardinality("assessment_questions"."accepted_answers") > 0) or ("assessment_questions"."kind" = 'mcq' and cardinality("assessment_questions"."accepted_answers") = 0))
);
--> statement-breakpoint
CREATE TABLE "phase_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phase_id" uuid NOT NULL,
	"title" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	CONSTRAINT "phase_assessments_phase_id_unique" UNIQUE("phase_id")
);
--> statement-breakpoint
CREATE TABLE "phase_completions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"phase_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_assessment_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("assessment_attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_selected_option_id_assessment_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."assessment_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_phase_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."phase_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_options" ADD CONSTRAINT "assessment_options_question_id_assessment_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."assessment_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_phase_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."phase_assessments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_assessments" ADD CONSTRAINT "phase_assessments_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_completions" ADD CONSTRAINT "phase_completions_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "phase_completions" ADD CONSTRAINT "phase_completions_phase_id_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_answers_attempt_question_unique" ON "assessment_answers" USING btree ("assessment_attempt_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_attempts_number_unique" ON "assessment_attempts" USING btree ("enrollment_id","assessment_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_options_position_unique" ON "assessment_options" USING btree ("question_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_options_one_correct" ON "assessment_options" USING btree ("question_id") WHERE "assessment_options"."is_correct";--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_questions_position_unique" ON "assessment_questions" USING btree ("assessment_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "phase_completions_enrollment_phase_unique" ON "phase_completions" USING btree ("enrollment_id","phase_id");