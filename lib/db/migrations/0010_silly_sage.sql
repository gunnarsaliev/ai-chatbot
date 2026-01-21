ALTER TABLE "Subscription" ADD COLUMN "metadata" json;--> statement-breakpoint
ALTER TABLE "User" ADD COLUMN "userType" varchar DEFAULT 'individual' NOT NULL;