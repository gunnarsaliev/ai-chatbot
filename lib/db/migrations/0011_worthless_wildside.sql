ALTER TABLE "Subscription" ADD COLUMN "availableCredits" integer;--> statement-breakpoint
ALTER TABLE "Subscription" ADD COLUMN "totalCredits" integer;--> statement-breakpoint
ALTER TABLE "Subscription" ADD COLUMN "creditsResetAt" timestamp;