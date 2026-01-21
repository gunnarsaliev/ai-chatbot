"use client";

import { CheckIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type BillingInterval = "monthly" | "annual";
type PlanType = "individual" | "business";

interface PricingTier {
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  priceIdMonthly?: string;
  priceIdAnnual?: string;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
}

// Stripe price IDs - these will be undefined until you configure them in .env.local
const STRIPE_PRICES = {
  // B2C Individual Plans
  proMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
  proAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL,
  powerMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_POWER_MONTHLY,
  powerAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_POWER_ANNUAL,

  // B2B Business Plans
  businessStarterMonthly:
    process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_STARTER_MONTHLY,
  businessStarterAnnual:
    process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_STARTER_ANNUAL,
  businessProMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_PRO_MONTHLY,
  businessProAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_PRO_ANNUAL,
};

// B2C Individual Tiers
const individualTiers: PricingTier[] = [
  {
    name: "Free",
    priceMonthly: 0,
    priceAnnual: 0,
    description: "100 messages/month, 10/day cap",
    features: [
      "100 total messages per month",
      "10 messages per day limit",
      "5 saved recipes",
      "Basic chat history",
    ],
    cta: "Get Started",
  },
  {
    name: "Pro",
    priceMonthly: 5,
    priceAnnual: 50, // ~17% discount
    priceIdMonthly: STRIPE_PRICES.proMonthly,
    priceIdAnnual: STRIPE_PRICES.proAnnual,
    description: "500 messages/month, no daily cap",
    features: [
      "500 total messages per month",
      "No daily cap",
      "Unlimited saved recipes",
      "Priority responses",
      "Top-up credits available ($5 = 500 messages)",
    ],
    popular: true,
    cta: "Upgrade to Pro",
  },
  {
    name: "Power",
    priceMonthly: 20,
    priceAnnual: 200, // ~17% discount
    priceIdMonthly: STRIPE_PRICES.powerMonthly,
    priceIdAnnual: STRIPE_PRICES.powerAnnual,
    description: "3,000 messages/month for heavy users",
    features: [
      "3,000 total messages per month",
      "No daily cap",
      "Unlimited saved recipes",
      "Priority responses",
      "Advanced meal planning",
    ],
    cta: "Upgrade to Power",
  },
];

// B2B Business Tiers
const businessTiers: PricingTier[] = [
  {
    name: "Free",
    priceMonthly: 0,
    priceAnnual: 0,
    description: "Basic menu builder for small businesses",
    features: [
      "100 message credits/month",
      "Unlimited menu items",
      "Free QR code menu generator",
      "500 KB AI agent storage",
      "No chatbot/widget",
    ],
    cta: "Get Started",
  },
  {
    name: "Starter",
    priceMonthly: 40,
    priceAnnual: 408, // ~15% discount
    priceIdMonthly: STRIPE_PRICES.businessStarterMonthly,
    priceIdAnnual: STRIPE_PRICES.businessStarterAnnual,
    description: "Per user/month for small restaurants",
    features: [
      "10,000 message credits/month",
      "Full menu builder with chatbot",
      "QR code & widget/plugin",
      "Multi-language (50+)",
      "20 MB AI agent fine-tune storage",
      "3% fee after 10 free orders",
      "Exposure in B2C marketplace",
    ],
    popular: true,
    cta: "Upgrade to Starter",
  },
  {
    name: "Pro",
    priceMonthly: 90,
    priceAnnual: 918, // ~15% discount
    priceIdMonthly: STRIPE_PRICES.businessProMonthly,
    priceIdAnnual: STRIPE_PRICES.businessProAnnual,
    description: "Per user/month for growing chains",
    features: [
      "Unlimited message credits",
      "Everything in Starter",
      "60 MB AI agent fine-tune storage",
      "Advanced analytics",
      "Integrations (Shopify/Magento)",
      "Custom branding",
      "Priority support",
      "Team access",
    ],
    cta: "Upgrade to Pro",
  },
];

export function Pricing() {
  const [planType, setPlanType] = useState<PlanType>("individual");
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  const tiers = planType === "individual" ? individualTiers : businessTiers;
  const discountPercentage = planType === "individual" ? 17 : 15;

  const handleSubscribe = async (tier: PricingTier) => {
    if (tier.name === "Free") {
      // Redirect to signup
      window.location.href = "/register";
      return;
    }

    const priceId =
      interval === "monthly" ? tier.priceIdMonthly : tier.priceIdAnnual;

    if (!priceId) {
      console.error("Price ID not configured for", tier.name, interval);
      console.error(
        "Stripe is not configured yet. Please add your Stripe Price IDs to the .env.local file. See STRIPE_SETUP.md for instructions."
      );
      return;
    }

    setLoading(tier.name);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ priceId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Checkout error:", errorData);
        console.error(
          `Error: ${errorData.error || "Failed to create checkout session"}`
        );
        return;
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
        console.error("Failed to get checkout URL. Please try again.");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      console.error(
        "An error occurred. Please check the console and try again."
      );
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
        <p className="text-muted-foreground text-lg mb-8">
          Select the perfect plan for your needs
        </p>

        {/* Plan Type Tabs (Individual/Business) */}
        <div className="inline-flex items-center gap-2 p-1 bg-muted rounded-lg mb-6">
          <button
            className={`px-6 py-2 rounded-md transition-colors ${
              planType === "individual"
                ? "bg-background shadow-sm"
                : "hover:bg-background/50"
            }`}
            onClick={() => setPlanType("individual")}
            type="button"
          >
            Individual
          </button>
          <button
            className={`px-6 py-2 rounded-md transition-colors ${
              planType === "business"
                ? "bg-background shadow-sm"
                : "hover:bg-background/50"
            }`}
            onClick={() => setPlanType("business")}
            type="button"
          >
            Business
          </button>
        </div>

        {/* Billing Interval Toggle */}
        <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg">
          <button
            className={`px-6 py-2 rounded-md transition-colors ${
              interval === "monthly"
                ? "bg-background shadow-sm"
                : "hover:bg-background/50"
            }`}
            onClick={() => setInterval("monthly")}
            type="button"
          >
            Monthly
          </button>
          <button
            className={`px-6 py-2 rounded-md transition-colors ${
              interval === "annual"
                ? "bg-background shadow-sm"
                : "hover:bg-background/50"
            }`}
            onClick={() => setInterval("annual")}
            type="button"
          >
            Annual
            <Badge className="ml-2" variant="secondary">
              Save {discountPercentage}%
            </Badge>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tier) => (
          <Card
            className={`relative flex flex-col ${
              tier.popular ? "border-primary shadow-lg" : ""
            }`}
            key={tier.name}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="default">Most Popular</Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <CardDescription>
                <div className="mt-2 mb-4">
                  <p className="text-sm text-muted-foreground">
                    {tier.description}
                  </p>
                </div>
                <div>
                  {tier.priceMonthly === 0 ? (
                    <span className="text-3xl font-bold">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">
                        $
                        {interval === "monthly"
                          ? tier.priceMonthly
                          : Math.round((tier.priceAnnual / 12) * 100) / 100}
                      </span>
                      <span className="text-muted-foreground">/month</span>
                      {interval === "annual" && tier.priceAnnual > 0 && (
                        <div className="text-sm text-muted-foreground mt-1">
                          Billed ${tier.priceAnnual}/year
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardDescription>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {tier.features.map((feature) => (
                  <li className="flex items-start gap-2 text-sm" key={feature}>
                    <CheckIcon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                disabled={loading === tier.name}
                onClick={() => handleSubscribe(tier)}
                variant={tier.popular ? "default" : "outline"}
              >
                {loading === tier.name ? "Loading..." : tier.cta}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
