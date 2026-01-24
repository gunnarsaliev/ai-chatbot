import type { UserType } from "@/app/(auth)/auth";
import { getSubscriptionByUserId } from "@/lib/db/queries";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/stripe";

type Entitlements = {
  // B2C limits
  maxMessagesPerMonth?: number;
  maxMessagesPerDay?: number;

  // B2B limits
  messageCredits?: number;
  finetuneStorageMB?: number;
  aiAgentCount?: number;

  // Common limits
  maxSavedRecipes: number;
  maxVectorDocs: number;
  teamSeats?: number;
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerMonth: 20,
    maxMessagesPerDay: 5,
    maxSavedRecipes: 0,
    maxVectorDocs: 0,
  },

  /*
   * For users with an account (free tier by default)
   */
  regular: {
    maxMessagesPerMonth: 100,
    maxMessagesPerDay: 10,
    maxSavedRecipes: 5,
    maxVectorDocs: 50,
  },
};

export async function getUserEntitlements(
  userId: string
): Promise<Entitlements> {
  try {
    const subscription = await getSubscriptionByUserId({ userId });

    // If no subscription or not active, use free tier (B2C)
    if (!subscription || subscription.status !== "active") {
      return {
        maxMessagesPerMonth: TIER_LIMITS.free.messagesPerMonth,
        maxMessagesPerDay: TIER_LIMITS.free.messagesPerDay,
        maxSavedRecipes: TIER_LIMITS.free.savedRecipes,
        maxVectorDocs: TIER_LIMITS.free.vectorDocs,
      };
    }

    const tier = subscription.tier as SubscriptionTier;
    const limits = TIER_LIMITS[tier];

    // Check if Stripe metadata overrides exist (for backward compatibility)
    const metadata = subscription.metadata as any;

    // Use new availableCredits column, fall back to metadata for backward compatibility
    let messageCredits = subscription.availableCredits ?? metadata?.messageCredits ?? limits.messageCredits;

    // If this is a Pro/Power tier and no messageCredits exist, use messagesPerMonth as credits
    if ((tier === "pro" || tier === "power") && messageCredits === undefined) {
      messageCredits = limits.messagesPerMonth;
    }

    return {
      // B2C limits
      maxMessagesPerMonth:
        metadata?.maxMessagesPerMonth ?? limits.messagesPerMonth,
      maxMessagesPerDay: metadata?.maxMessagesPerDay ?? limits.messagesPerDay,

      // B2B limits / Pro credit system (now using dedicated column)
      messageCredits,
      finetuneStorageMB:
        metadata?.finetuneStorageMB ?? limits.finetuneStorageMB,
      aiAgentCount: metadata?.aiAgentCount ?? limits.aiAgentCount,

      // Common limits
      maxSavedRecipes: metadata?.maxSavedRecipes ?? limits.savedRecipes,
      maxVectorDocs: metadata?.maxVectorDocs ?? limits.vectorDocs,
      teamSeats: metadata?.teamSeats ?? limits.teamSeats,
    };
  } catch (error) {
    console.error("Error getting user entitlements:", error);
    // Return free tier limits on error
    return {
      maxMessagesPerMonth: TIER_LIMITS.free.messagesPerMonth,
      maxMessagesPerDay: TIER_LIMITS.free.messagesPerDay,
      maxSavedRecipes: TIER_LIMITS.free.savedRecipes,
      maxVectorDocs: TIER_LIMITS.free.vectorDocs,
    };
  }
}

export async function checkMessageLimit(
  userId: string,
  messageCount: number,
  period: "day" | "month" = "month"
): Promise<{ allowed: boolean; limit: number; remaining: number }> {
  const entitlements = await getUserEntitlements(userId);

  // Determine which limit to check based on period
  const limit =
    period === "day"
      ? entitlements.maxMessagesPerDay
      : entitlements.maxMessagesPerMonth ?? entitlements.messageCredits;

  // -1 or undefined means unlimited
  if (limit === -1 || limit === undefined) {
    return { allowed: true, limit: -1, remaining: -1 };
  }

  const remaining = Math.max(0, limit - messageCount);
  const allowed = messageCount < limit;

  return { allowed, limit, remaining };
}

export async function checkMessageCredits(
  userId: string,
  requiredCredits: number
): Promise<{ allowed: boolean; currentCredits: number; remaining: number }> {
  try {
    const entitlements = await getUserEntitlements(userId);

    // If messageCredits is -1, it means unlimited (B2B unlimited plan)
    if (entitlements.messageCredits === -1) {
      return { allowed: true, currentCredits: -1, remaining: -1 };
    }

    // If messageCredits is undefined, user doesn't have a credit-based subscription
    // They should use B2C message limits instead, so we skip credit checks
    if (entitlements.messageCredits === undefined) {
      console.log(
        "[checkMessageCredits] User has no credit system - allowing (will use B2C limits)"
      );
      return { allowed: true, currentCredits: -1, remaining: -1 };
    }

    const remaining = Math.max(0, entitlements.messageCredits - requiredCredits);
    const allowed = entitlements.messageCredits >= requiredCredits;

    return {
      allowed,
      currentCredits: entitlements.messageCredits,
      remaining,
    };
  } catch (error) {
    console.error("[checkMessageCredits] Error:", error);
    // On error, allow but use B2C limits
    return { allowed: true, currentCredits: -1, remaining: -1 };
  }
}
