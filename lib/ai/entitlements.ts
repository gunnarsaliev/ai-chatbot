import type { UserType } from "@/app/(auth)/auth";
import { getSubscriptionByUserId } from "@/lib/db/queries";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/stripe";

type Entitlements = {
  maxMessagesPerDay: number;
  maxSavedRecipes: number;
  maxVectorDocs: number;
  teamSeats?: number;
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    maxSavedRecipes: 0,
    maxVectorDocs: 0,
  },

  /*
   * For users with an account (free tier by default)
   */
  regular: {
    maxMessagesPerDay: 50,
    maxSavedRecipes: 5,
    maxVectorDocs: 50,
  },
};

export async function getUserEntitlements(
  userId: string
): Promise<Entitlements> {
  try {
    const subscription = await getSubscriptionByUserId({ userId });

    // If no subscription or not active, use free tier
    if (!subscription || subscription.status !== "active") {
      return {
        maxMessagesPerDay: TIER_LIMITS.free.messagesPerDay,
        maxSavedRecipes: TIER_LIMITS.free.savedRecipes,
        maxVectorDocs: TIER_LIMITS.free.vectorDocs,
      };
    }

    const tier = subscription.tier as SubscriptionTier;
    const limits = TIER_LIMITS[tier];

    return {
      maxMessagesPerDay: limits.messagesPerDay,
      maxSavedRecipes: limits.savedRecipes,
      maxVectorDocs: limits.vectorDocs,
      teamSeats: limits.teamSeats,
    };
  } catch (error) {
    console.error("Error getting user entitlements:", error);
    // Return free tier limits on error
    return {
      maxMessagesPerDay: TIER_LIMITS.free.messagesPerDay,
      maxSavedRecipes: TIER_LIMITS.free.savedRecipes,
      maxVectorDocs: TIER_LIMITS.free.vectorDocs,
    };
  }
}

export async function checkMessageLimit(
  userId: string,
  messageCount: number
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  const entitlements = await getUserEntitlements(userId);
  const limit = entitlements.maxMessagesPerDay;

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1, remaining: -1 };
  }

  const remaining = Math.max(0, limit - messageCount);
  const allowed = messageCount < limit;

  return { allowed, limit, remaining };
}
