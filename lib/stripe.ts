import "server-only";

import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-12-15.clover",
  typescript: true,
});

export const STRIPE_PRICE_IDS = {
  // B2C Individual Plans
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL || "",
  power_monthly: process.env.STRIPE_PRICE_POWER_MONTHLY || "",
  power_annual: process.env.STRIPE_PRICE_POWER_ANNUAL || "",

  // B2B Business Plans
  business_starter_monthly: process.env.STRIPE_PRICE_BUSINESS_STARTER_MONTHLY || "",
  business_starter_annual: process.env.STRIPE_PRICE_BUSINESS_STARTER_ANNUAL || "",
  business_pro_monthly: process.env.STRIPE_PRICE_BUSINESS_PRO_MONTHLY || "",
  business_pro_annual: process.env.STRIPE_PRICE_BUSINESS_PRO_ANNUAL || "",
} as const;

export type SubscriptionTier =
  | "free"
  | "pro"
  | "power"
  | "business_free"
  | "business_starter"
  | "business_pro";
export type BillingInterval = "monthly" | "annual";

export interface TierLimits {
  // B2C limits (Individual plans)
  messagesPerMonth?: number; // total messages per month for B2C
  messagesPerDay?: number; // daily cap for B2C free tier

  // B2B limits (Business plans)
  messageCredits?: number; // monthly message credits for B2B
  finetuneStorageMB?: number; // AI agent fine-tune storage
  aiAgentCount?: number; // number of AI agents allowed

  // Common limits
  savedRecipes: number;
  vectorDocs: number;
  teamSeats?: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  // B2C Individual Plans
  free: {
    messagesPerMonth: 100, // 100 total per month
    messagesPerDay: 10, // daily cap of 10
    savedRecipes: 5,
    vectorDocs: 50,
  },
  pro: {
    messagesPerMonth: 500, // 500 total per month
    savedRecipes: -1, // unlimited
    vectorDocs: 1000,
  },
  power: {
    messagesPerMonth: 3000, // 3000 total per month
    savedRecipes: -1, // unlimited
    vectorDocs: 5000,
  },

  // B2B Business Plans
  business_free: {
    messageCredits: 100, // 100 message credits
    finetuneStorageMB: 0.5, // 500 KB = 0.5 MB
    aiAgentCount: 1,
    savedRecipes: -1, // unlimited menu items
    vectorDocs: 100,
  },
  business_starter: {
    messageCredits: 10000, // 10K message credits
    finetuneStorageMB: 20, // 20 MB storage
    aiAgentCount: 3,
    savedRecipes: -1, // unlimited
    vectorDocs: 1000,
    teamSeats: 1, // per user pricing
  },
  business_pro: {
    messageCredits: -1, // unlimited
    finetuneStorageMB: 60, // 60 MB storage
    aiAgentCount: 10,
    savedRecipes: -1, // unlimited
    vectorDocs: -1, // unlimited
    teamSeats: 1, // per user pricing
  },
};

// Map Stripe price IDs to tier and billing interval
export function getPriceDetails(priceId: string): {
  tier: SubscriptionTier;
  interval: BillingInterval;
} | null {
  switch (priceId) {
    // B2C Individual Plans
    case STRIPE_PRICE_IDS.pro_monthly:
      return { tier: "pro", interval: "monthly" };
    case STRIPE_PRICE_IDS.pro_annual:
      return { tier: "pro", interval: "annual" };
    case STRIPE_PRICE_IDS.power_monthly:
      return { tier: "power", interval: "monthly" };
    case STRIPE_PRICE_IDS.power_annual:
      return { tier: "power", interval: "annual" };

    // B2B Business Plans
    case STRIPE_PRICE_IDS.business_starter_monthly:
      return { tier: "business_starter", interval: "monthly" };
    case STRIPE_PRICE_IDS.business_starter_annual:
      return { tier: "business_starter", interval: "annual" };
    case STRIPE_PRICE_IDS.business_pro_monthly:
      return { tier: "business_pro", interval: "monthly" };
    case STRIPE_PRICE_IDS.business_pro_annual:
      return { tier: "business_pro", interval: "annual" };

    default:
      return null;
  }
}

// Helper to determine if tier is business
export function isBusinessTier(tier: SubscriptionTier): boolean {
  return tier.startsWith("business_");
}
