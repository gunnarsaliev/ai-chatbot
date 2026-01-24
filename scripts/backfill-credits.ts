import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq, and, isNull } from "drizzle-orm";
import postgres from "postgres";
import { subscription } from "../lib/db/schema";
import { TIER_LIMITS } from "../lib/stripe";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function backfillCredits() {
  console.log("Starting credit backfill for Pro/Power users...");

  // Find all Pro/Power subscriptions that don't have availableCredits set
  const subscriptions = await db
    .select()
    .from(subscription)
    .where(
      and(
        isNull(subscription.availableCredits),
        eq(subscription.status, "active")
      )
    );

  console.log(`Found ${subscriptions.length} subscriptions to backfill`);

  for (const sub of subscriptions) {
    const tier = sub.tier as "pro" | "power" | "free" | "business_free" | "business_starter" | "business_pro";

    // Only backfill Pro and Power tiers
    if (tier !== "pro" && tier !== "power") {
      console.log(`Skipping ${tier} tier for user ${sub.userId}`);
      continue;
    }

    const metadata = (sub.metadata as any) || {};
    const existingCredits = metadata.messageCredits;

    // Determine credits to set
    let availableCredits: number;
    let totalCredits: number;

    if (tier === "pro") {
      availableCredits = existingCredits ?? 500;
      totalCredits = 500;
    } else if (tier === "power") {
      availableCredits = existingCredits ?? 3000;
      totalCredits = 3000;
    } else {
      continue;
    }

    console.log(`Backfilling ${tier} subscription for user ${sub.userId}: ${availableCredits}/${totalCredits} credits`);

    await db
      .update(subscription)
      .set({
        availableCredits,
        totalCredits,
        creditsResetAt: sub.currentPeriodEnd || undefined,
        metadata: {
          ...metadata,
          messageCredits: availableCredits,
        },
        updatedAt: new Date(),
      })
      .where(eq(subscription.id, sub.id));
  }

  console.log("Credit backfill completed!");
  await client.end();
}

backfillCredits().catch((error) => {
  console.error("Error during credit backfill:", error);
  process.exit(1);
});
