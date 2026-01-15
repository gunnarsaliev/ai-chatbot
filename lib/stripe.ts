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
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL || "",
  creator_monthly: process.env.STRIPE_PRICE_CREATOR_MONTHLY || "",
  creator_annual: process.env.STRIPE_PRICE_CREATOR_ANNUAL || "",
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY || "",
  business_annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL || "",
} as const;

export type SubscriptionTier = "free" | "pro" | "creator" | "business" | "enterprise";
export type BillingInterval = "monthly" | "annual";

export interface TierLimits {
  messagesPerDay: number;
  savedRecipes: number;
  vectorDocs: number;
  teamSeats?: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    messagesPerDay: 50,
    savedRecipes: 5,
    vectorDocs: 50,
  },
  pro: {
    messagesPerDay: 500,
    savedRecipes: -1, // unlimited
    vectorDocs: 1000,
  },
  creator: {
    messagesPerDay: 2000,
    savedRecipes: -1, // unlimited
    vectorDocs: 5000,
  },
  business: {
    messagesPerDay: 10000,
    savedRecipes: -1, // unlimited
    vectorDocs: -1, // unlimited
    teamSeats: 3,
  },
  enterprise: {
    messagesPerDay: -1, // unlimited
    savedRecipes: -1, // unlimited
    vectorDocs: -1, // unlimited
    teamSeats: -1, // unlimited
  },
};

// Map Stripe price IDs to tier and billing interval
export function getPriceDetails(priceId: string): {
  tier: SubscriptionTier;
  interval: BillingInterval;
} | null {
  switch (priceId) {
    case STRIPE_PRICE_IDS.pro_monthly:
      return { tier: "pro", interval: "monthly" };
    case STRIPE_PRICE_IDS.pro_annual:
      return { tier: "pro", interval: "annual" };
    case STRIPE_PRICE_IDS.creator_monthly:
      return { tier: "creator", interval: "monthly" };
    case STRIPE_PRICE_IDS.creator_annual:
      return { tier: "creator", interval: "annual" };
    case STRIPE_PRICE_IDS.business_monthly:
      return { tier: "business", interval: "monthly" };
    case STRIPE_PRICE_IDS.business_annual:
      return { tier: "business", interval: "annual" };
    default:
      return null;
  }
}
