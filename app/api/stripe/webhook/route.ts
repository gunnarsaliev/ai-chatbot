import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import postgres from "postgres";
import type Stripe from "stripe";
import {
  getSubscriptionByUserId,
  getUserByStripeCustomerId,
  upsertSubscription,
} from "@/lib/db/queries";
import { user } from "@/lib/db/schema";
import { getPriceDetails, isBusinessTier, stripe } from "@/lib/stripe";

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// GET handler to verify webhook is accessible and ready to receive events
export function GET() {
  return NextResponse.json({
    message: "Stripe webhook endpoint is active",
    timestamp: new Date().toISOString(),
    status: "ready",
  });
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    console.log(`[Webhook] Received event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[Webhook] Checkout session completed:", {
          sessionId: session.id,
          customer: session.customer,
          mode: session.mode,
          subscription: session.subscription,
          metadata: session.metadata,
        });

        if (session.mode === "subscription" && session.subscription) {
          // Retrieve the subscription to get full details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await handleSubscriptionUpdate(subscription);
          console.log("[Webhook] Subscription created successfully");
        } else if (session.mode === "payment" && session.metadata?.type === "credit_topup") {
          // Handle one-time credit purchase
          await handleCreditTopUp(session);
          console.log("[Webhook] Credit top-up processed successfully");
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancellation(subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        // @ts-expect-error - subscription exists on Invoice but may not be in type definition
        const subscriptionId = invoice.subscription;
        if (subscriptionId && typeof subscriptionId === "string") {
          const subscription =
            await stripe.subscriptions.retrieve(subscriptionId);
          await handleSubscriptionUpdate(subscription);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  console.log("[handleSubscriptionUpdate] Processing subscription:", {
    subscriptionId: subscription.id,
    customerId,
    priceId,
    status: subscription.status,
  });

  if (!priceId) {
    console.error(
      "[handleSubscriptionUpdate] No price ID found in subscription"
    );
    return;
  }

  // Get user by Stripe customer ID
  const foundUser = await getUserByStripeCustomerId({
    stripeCustomerId: customerId,
  });

  if (!foundUser) {
    console.error(
      `[handleSubscriptionUpdate] No user found for Stripe customer ${customerId}`
    );
    console.error(
      "[handleSubscriptionUpdate] This likely means the customer was created in Stripe but not linked in our database"
    );
    return;
  }

  console.log("[handleSubscriptionUpdate] Found user:", {
    userId: foundUser.id,
    email: foundUser.email,
  });

  // Get tier and interval from price ID
  const priceDetails = getPriceDetails(priceId);

  if (!priceDetails) {
    console.error(`[handleSubscriptionUpdate] Unknown price ID: ${priceId}`);
    console.error(
      "[handleSubscriptionUpdate] Make sure this price ID is configured in STRIPE_PRICE_* environment variables"
    );
    return;
  }

  console.log("[handleSubscriptionUpdate] Price details:", priceDetails);

  // Determine user type based on tier
  const userType = isBusinessTier(priceDetails.tier)
    ? "business"
    : "individual";

  // Update user type based on subscription tier
  try {
    await db.update(user).set({ userType }).where(eq(user.id, foundUser.id));
    console.log("[handleSubscriptionUpdate] Updated user type to:", userType);
  } catch (error) {
    console.error(
      "[handleSubscriptionUpdate] Error updating user type:",
      error
    );
  }

  // Get Stripe product metadata for this price
  let metadata: any = {};
  try {
    const price = await stripe.prices.retrieve(priceId, {
      expand: ["product"],
    });
    const product = price.product as Stripe.Product;
    metadata = product.metadata || {};
    console.log(
      "[handleSubscriptionUpdate] Stripe product metadata:",
      metadata
    );
  } catch (error) {
    console.error(
      "[handleSubscriptionUpdate] Error fetching Stripe product metadata:",
      error
    );
  }

  // Initialize credits for tiers that use credit system
  // Access period properties via index signature to avoid type errors
  const sub = subscription as any;
  let availableCredits: number | undefined;
  let totalCredits: number | undefined;
  let creditsResetAt: Date | undefined;

  // Determine credit amounts based on tier
  const tierLimits = {
    pro: { credits: 500 },
    power: { credits: 3000 },
    business_free: { credits: 100 },
    business_starter: { credits: 10000 },
    business_pro: { credits: -1 }, // unlimited
  };

  const tierCredits = tierLimits[priceDetails.tier as keyof typeof tierLimits];

  if (tierCredits) {
    // If credits are -1 (unlimited), don't set columns, leave as undefined/null
    if (tierCredits.credits !== -1) {
      availableCredits = metadata.messageCredits ?? tierCredits.credits;
      totalCredits = tierCredits.credits;
      creditsResetAt = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : undefined;
      metadata.messageCredits = availableCredits; // Keep metadata in sync for backward compatibility
      console.log(`[handleSubscriptionUpdate] Initialized ${priceDetails.tier} with`, availableCredits, "credits");
    } else {
      // Unlimited credits - set to -1 in metadata
      metadata.messageCredits = -1;
      console.log(`[handleSubscriptionUpdate] Initialized ${priceDetails.tier} with unlimited credits`);
    }
  }

  const subscriptionData = {
    userId: foundUser.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    tier: priceDetails.tier,
    billingInterval: priceDetails.interval,
    status: subscription.status as any,
    currentPeriodStart: sub.current_period_start
      ? new Date(sub.current_period_start * 1000)
      : undefined,
    currentPeriodEnd: sub.current_period_end
      ? new Date(sub.current_period_end * 1000)
      : undefined,
    cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
    availableCredits,
    totalCredits,
    creditsResetAt,
    metadata,
  };

  console.log(
    "[handleSubscriptionUpdate] Upserting subscription:",
    subscriptionData
  );

  try {
    await upsertSubscription(subscriptionData);
    console.log(
      "[handleSubscriptionUpdate] Successfully upserted subscription for user",
      foundUser.id
    );
  } catch (error) {
    console.error(
      "[handleSubscriptionUpdate] Error upserting subscription:",
      error
    );
    throw error;
  }
}

async function handleSubscriptionCancellation(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  // Get user by Stripe customer ID
  const user = await getUserByStripeCustomerId({
    stripeCustomerId: customerId,
  });

  if (!user) {
    console.error(`No user found for Stripe customer ${customerId}`);
    return;
  }

  // Set subscription back to free tier
  await upsertSubscription({
    userId: user.id,
    stripeCustomerId: customerId,
    stripeSubscriptionId: undefined,
    stripePriceId: undefined,
    tier: "free",
    billingInterval: undefined,
    status: "canceled",
    currentPeriodStart: undefined,
    currentPeriodEnd: undefined,
    cancelAtPeriodEnd: false,
  });
}

async function handleCreditTopUp(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const credits = session.metadata?.credits;

  if (!userId || !credits) {
    console.error("[handleCreditTopUp] Missing required metadata:", {
      userId,
      credits,
    });
    return;
  }

  console.log("[handleCreditTopUp] Processing credit top-up:", {
    userId,
    credits,
    sessionId: session.id,
  });

  // Get user's subscription
  const subscription = await getSubscriptionByUserId({ userId });

  if (!subscription) {
    console.error(
      `[handleCreditTopUp] No subscription found for user ${userId}`
    );
    return;
  }

  console.log("[handleCreditTopUp] Found subscription:", {
    tier: subscription.tier,
    currentCredits: subscription.metadata,
  });

  // Add credits to existing balance using new dedicated column
  const metadata = (subscription.metadata as any) || {};
  const currentCredits = subscription.availableCredits ?? metadata.messageCredits ?? 0;
  const newCredits = currentCredits + Number.parseInt(credits, 10);

  console.log("[handleCreditTopUp] Updating credits:", {
    currentCredits,
    addedCredits: credits,
    newTotal: newCredits,
  });

  // Update subscription with new credit balance in both new column and metadata
  await upsertSubscription({
    userId,
    stripeCustomerId: subscription.stripeCustomerId || undefined,
    stripeSubscriptionId: subscription.stripeSubscriptionId || undefined,
    stripePriceId: subscription.stripePriceId || undefined,
    tier: subscription.tier,
    billingInterval: subscription.billingInterval || undefined,
    status: subscription.status || undefined,
    currentPeriodStart: subscription.currentPeriodStart || undefined,
    currentPeriodEnd: subscription.currentPeriodEnd || undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd || false,
    availableCredits: newCredits,
    totalCredits: subscription.totalCredits ?? undefined,
    creditsResetAt: subscription.creditsResetAt ?? undefined,
    metadata: {
      ...metadata,
      messageCredits: newCredits,
    },
  });

  console.log(
    `[handleCreditTopUp] Successfully added ${credits} credits to user ${userId}. New balance: ${newCredits}`
  );
}
