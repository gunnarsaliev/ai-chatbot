#!/usr/bin/env tsx
/**
 * Debug script to check subscription setup
 * Run with: npx tsx scripts/debug-subscriptions.ts
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

// Load .env.local first, then .env
config({ path: ".env.local" });
config();

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

async function main() {
  console.log("🔍 Debugging Subscription Setup\n");

  // 1. Check if Subscription table exists
  console.log("1️⃣ Checking if Subscription table exists...");
  try {
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'Subscription'
      );
    `);
    console.log("   ✅ Subscription table exists:", tableExists);
  } catch (error) {
    console.error("   ❌ Error checking table:", error);
  }

  // 2. Check table structure
  console.log("\n2️⃣ Checking Subscription table structure...");
  try {
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Subscription'
      ORDER BY ordinal_position;
    `);
    console.log("   Columns:", columns.rows);
  } catch (error) {
    console.error("   ❌ Error checking structure:", error);
  }

  // 3. Count subscriptions
  console.log("\n3️⃣ Counting subscriptions in database...");
  try {
    const count = await db.execute(sql`SELECT COUNT(*) as count FROM "Subscription";`);
    const totalCount = count[0]?.count || 0;
    console.log("   Total subscriptions:", totalCount);

    if (totalCount === 0) {
      console.log("   ⚠️  No subscriptions found in database!");
      console.log("   This is likely why you're not seeing subscriptions.");
    }
  } catch (error) {
    console.error("   ❌ Error counting subscriptions:", error);
  }

  // 4. Show recent subscriptions
  console.log("\n4️⃣ Showing recent subscriptions...");
  try {
    const subscriptions = await db.execute(sql`
      SELECT
        id,
        "userId",
        "stripeCustomerId",
        "stripeSubscriptionId",
        tier,
        status,
        "billingInterval",
        "createdAt"
      FROM "Subscription"
      ORDER BY "createdAt" DESC
      LIMIT 5;
    `);
    if (subscriptions && subscriptions.length > 0) {
      console.log("   Recent subscriptions:", JSON.stringify(subscriptions, null, 2));
    } else {
      console.log("   No subscriptions found");
    }
  } catch (error) {
    console.error("   ❌ Error fetching subscriptions:", error);
  }

  // 5. Check User table for stripeCustomerId
  console.log("\n5️⃣ Checking users with Stripe customer IDs...");
  try {
    const users = await db.execute(sql`
      SELECT id, email, "stripeCustomerId"
      FROM "User"
      WHERE "stripeCustomerId" IS NOT NULL
      LIMIT 5;
    `);
    if (users && users.length > 0) {
      console.log("   Users with Stripe IDs:", JSON.stringify(users, null, 2));
    } else {
      console.log("   ⚠️  No users have Stripe customer IDs!");
      console.log("   This means subscriptions haven't been created yet.");
    }
  } catch (error) {
    console.error("   ❌ Error checking users:", error);
  }

  // 6. Check environment variables
  console.log("\n6️⃣ Checking environment variables...");
  const envVars = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "✅ Set" : "❌ Missing",
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? "✅ Set" : "❌ Missing",
    STRIPE_PRICE_PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || "❌ Missing",
    STRIPE_PRICE_PRO_ANNUAL: process.env.STRIPE_PRICE_PRO_ANNUAL || "❌ Missing",
    STRIPE_PRICE_CREATOR_MONTHLY: process.env.STRIPE_PRICE_CREATOR_MONTHLY || "❌ Missing",
    STRIPE_PRICE_CREATOR_ANNUAL: process.env.STRIPE_PRICE_CREATOR_ANNUAL || "❌ Missing",
    STRIPE_PRICE_BUSINESS_MONTHLY: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || "❌ Missing",
    STRIPE_PRICE_BUSINESS_ANNUAL: process.env.STRIPE_PRICE_BUSINESS_ANNUAL || "❌ Missing",
  };
  console.log("   Environment variables:", envVars);

  await client.end();
  console.log("\n✅ Debug complete!");
}

main().catch(console.error);
