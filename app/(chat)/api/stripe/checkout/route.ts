import { auth } from "@/app/(auth)/auth";
import { getSubscriptionByUserId, updateUserStripeCustomerId } from "@/lib/db/queries";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    console.log("[Checkout] Starting checkout process...");
    const session = await auth();

    if (!session?.user?.id) {
      console.error("[Checkout] User not authenticated");
      return NextResponse.json({ error: "Unauthorized. Please log in first." }, { status: 401 });
    }

    console.log("[Checkout] User authenticated:", session.user.email);

    const { priceId } = await request.json();

    if (!priceId) {
      console.error("[Checkout] No price ID provided");
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    console.log("[Checkout] Price ID:", priceId);

    // Check if user already has a subscription
    console.log("[Checkout] Checking for existing subscription...");
    const existingSubscription = await getSubscriptionByUserId({
      userId: session.user.id,
    });

    if (
      existingSubscription &&
      existingSubscription.status === "active"
    ) {
      console.error("[Checkout] User already has active subscription:", existingSubscription.tier);
      return NextResponse.json(
        { error: "You already have an active subscription. Please cancel it first or use the Customer Portal to change plans." },
        { status: 400 }
      );
    }

    console.log("[Checkout] No active subscription found, proceeding...");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    console.log("[Checkout] App URL:", appUrl);

    // Create or retrieve Stripe customer
    let customerId = existingSubscription?.stripeCustomerId;

    if (customerId) {
      console.log("[Checkout] Using existing Stripe customer:", customerId);
    } else {
      console.log("[Checkout] Creating new Stripe customer...");
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        metadata: {
          userId: session.user.id,
        },
      });

      customerId = customer.id;
      console.log("[Checkout] Created Stripe customer:", customerId);

      // Update user with Stripe customer ID
      await updateUserStripeCustomerId({
        userId: session.user.id,
        stripeCustomerId: customerId,
      });
      console.log("[Checkout] Updated user with Stripe customer ID");
    }

    // Create Stripe Checkout session
    console.log("[Checkout] Creating Stripe checkout session...");
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}?canceled=true`,
      metadata: {
        userId: session.user.id,
      },
    });

    console.log("[Checkout] ✅ Checkout session created:", checkoutSession.id);
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[Checkout] ❌ Error creating checkout session:", error);

    // Enhanced error logging
    if (error instanceof Error) {
      console.error("[Checkout] Error name:", error.name);
      console.error("[Checkout] Error message:", error.message);
      console.error("[Checkout] Error stack:", error.stack);
    }

    // Return more specific error messages
    const errorMessage = error instanceof Error
      ? error.message
      : "Failed to create checkout session";

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.name : "Unknown error"
      },
      { status: 500 }
    );
  }
}
