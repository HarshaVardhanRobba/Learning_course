CREATE TYPE "public"."quiz_question_kind" AS ENUM('mcq', 'fill_blank');--> statement-breakpoint
CREATE TABLE "quiz_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_attempt_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_option_id" uuid,
	"text_answer" text,
	"is_correct" boolean NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"quiz_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"total_questions" integer NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"correct_count" integer,
	"score_percent" integer,
	"passed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "quiz_attempts_result_when_finished" CHECK (("quiz_attempts"."finished_at" is null and "quiz_attempts"."score_percent" is null and not "quiz_attempts"."passed") or ("quiz_attempts"."finished_at" is not null and "quiz_attempts"."score_percent" is not null))
);
--> statement-breakpoint
CREATE TABLE "quiz_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"is_correct" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quiz_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"kind" "quiz_question_kind" NOT NULL,
	"prompt" text NOT NULL,
	"accepted_answers" text[] DEFAULT '{}'::text[] NOT NULL,
	"explanation" text DEFAULT '' NOT NULL,
	CONSTRAINT "quiz_questions_answers_by_kind" CHECK (("quiz_questions"."kind" = 'fill_blank' and cardinality("quiz_questions"."accepted_answers") > 0) or ("quiz_questions"."kind" = 'mcq' and cardinality("quiz_questions"."accepted_answers") = 0))
);
--> statement-breakpoint
CREATE TABLE "topic_quizzes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"title" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	CONSTRAINT "topic_quizzes_topic_id_unique" UNIQUE("topic_id")
);
--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_quiz_attempt_id_quiz_attempts_id_fk" FOREIGN KEY ("quiz_attempt_id") REFERENCES "public"."quiz_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_selected_option_id_quiz_options_id_fk" FOREIGN KEY ("selected_option_id") REFERENCES "public"."quiz_options"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_enrollment_id_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."enrollments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_topic_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."topic_quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_options" ADD CONSTRAINT "quiz_options_question_id_quiz_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."quiz_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_topic_quizzes_id_fk" FOREIGN KEY ("quiz_id") REFERENCES "public"."topic_quizzes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_quizzes" ADD CONSTRAINT "topic_quizzes_topic_id_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_answers_attempt_question_unique" ON "quiz_answers" USING btree ("quiz_attempt_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempts_enrollment_quiz_number_unique" ON "quiz_attempts" USING btree ("enrollment_id","quiz_id","attempt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_attempts_one_open" ON "quiz_attempts" USING btree ("enrollment_id","quiz_id") WHERE "quiz_attempts"."finished_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_options_question_position_unique" ON "quiz_options" USING btree ("question_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_options_one_correct" ON "quiz_options" USING btree ("question_id") WHERE "quiz_options"."is_correct";--> statement-breakpoint
CREATE UNIQUE INDEX "quiz_questions_quiz_position_unique" ON "quiz_questions" USING btree ("quiz_id","position");