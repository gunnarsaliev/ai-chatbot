import { auth } from "@/app/(auth)/auth";
import { getSubscriptionByUserId, updateUserStripeCustomerId } from "@/lib/db/queries";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    console.log("[Buy Credits] Starting credit purchase process...");
    const session = await auth();

    if (!session?.user?.id) {
      console.error("[Buy Credits] User not authenticated");
      return NextResponse.json(
        { error: "Unauthorized. Please log in first." },
        { status: 401 }
      );
    }

    console.log("[Buy Credits] User authenticated:", session.user.email);

    const { amount } = await request.json();

    if (!amount || amount < 5) {
      console.error("[Buy Credits] Invalid amount:", amount);
      return NextResponse.json(
        { error: "Minimum purchase amount is $5" },
        { status: 400 }
      );
    }

    console.log("[Buy Credits] Purchase amount:", amount);

    // Check if user has a Pro subscription (required for top-ups)
    console.log("[Buy Credits] Checking user subscription...");
    const existingSubscription = await getSubscriptionByUserId({
      userId: session.user.id,
    });

    if (
      !existingSubscription ||
      (existingSubscription.tier !== "pro" && existingSubscription.tier !== "power")
    ) {
      console.error("[Buy Credits] User does not have Pro subscription");
      return NextResponse.json(
        {
          error:
            "Top-ups are only available to Pro users. Please upgrade to Pro first.",
        },
        { status: 403 }
      );
    }

    console.log("[Buy Credits] User has valid subscription:", existingSubscription.tier);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    console.log("[Buy Credits] App URL:", appUrl);

    // Create or retrieve Stripe customer
    let customerId = existingSubscription?.stripeCustomerId;

    if (customerId) {
      console.log("[Buy Credits] Using existing Stripe customer:", customerId);
    } else {
      console.log("[Buy Credits] Creating new Stripe customer...");
      const customer = await stripe.customers.create({
        email: session.user.email || undefined,
        metadata: {
          userId: session.user.id,
        },
      });

      customerId = customer.id;
      console.log("[Buy Credits] Created Stripe customer:", customerId);

      // Update user with Stripe customer ID
      await updateUserStripeCustomerId({
        userId: session.user.id,
        stripeCustomerId: customerId,
      });
      console.log("[Buy Credits] Updated user with Stripe customer ID");
    }

    // Calculate credits (100 credits per dollar)
    const credits = amount * 100;

    // Create Stripe Checkout session for one-time payment
    console.log("[Buy Credits] Creating Stripe checkout session...");
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Message Credits Top-Up",
              description: `${credits.toLocaleString()} message credits (${amount * 100} credits @ $${amount})`,
            },
            unit_amount: amount * 100, // Stripe uses cents
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}?credits_purchased=true&amount=${credits}`,
      cancel_url: `${appUrl}?credits_canceled=true`,
      metadata: {
        userId: session.user.id,
        credits: credits.toString(),
        type: "credit_topup",
      },
    });

    console.log("[Buy Credits] ✅ Checkout session created:", checkoutSession.id);
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("[Buy Credits] ❌ Error creating checkout session:", error);

    // Enhanced error logging
    if (error instanceof Error) {
      console.error("[Buy Credits] Error name:", error.name);
      console.error("[Buy Credits] Error message:", error.message);
      console.error("[Buy Credits] Error stack:", error.stack);
    }

    // Return more specific error messages
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to create checkout session";

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.name : "Unknown error",
      },
      { status: 500 }
    );
  }
}
