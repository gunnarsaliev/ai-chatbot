"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckIcon } from "@radix-ui/react-icons";

type BillingInterval = "monthly" | "annual";

interface PricingTier {
  name: string;
  priceMonthly: number;
  priceAnnual: number;
  priceIdMonthly?: string;
  priceIdAnnual?: string;
  messagesPerDay: string;
  savedRecipes: string;
  vectorDocs: string;
  features: string[];
  popular?: boolean;
  cta: string;
}

const tiers: PricingTier[] = [
  {
    name: "Free",
    priceMonthly: 0,
    priceAnnual: 0,
    messagesPerDay: "50",
    savedRecipes: "5",
    vectorDocs: "50",
    features: [
      "Basic recipes",
      "Personal profile (age/weight/goals)",
      "Limited chat history",
    ],
    cta: "Get Started",
  },
  {
    name: "Pro",
    priceMonthly: 8,
    priceAnnual: 80,
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL,
    messagesPerDay: "500",
    savedRecipes: "Unlimited",
    vectorDocs: "1,000",
    features: [
      "Unlimited personal use",
      "Public recipes",
      "Full profile personalization",
      "Priority model access",
    ],
    popular: true,
    cta: "Upgrade to Pro",
  },
  {
    name: "Creator",
    priceMonthly: 20,
    priceAnnual: 200,
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREATOR_MONTHLY,
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_CREATOR_ANNUAL,
    messagesPerDay: "2,000",
    savedRecipes: "Unlimited",
    vectorDocs: "5,000",
    features: [
      "All Pro features",
      "Verified badge",
      "Featured recipes",
      "Analytics on views/likes",
      "Bio page",
    ],
    cta: "Upgrade to Creator",
  },
  {
    name: "Business",
    priceMonthly: 50,
    priceAnnual: 500,
    priceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY,
    priceIdAnnual: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL,
    messagesPerDay: "10,000",
    savedRecipes: "Unlimited",
    vectorDocs: "Unlimited",
    features: [
      "All Creator features",
      "Team members (up to 3)",
      "Shared knowledge base",
      "Branded responses",
      "Client chats",
    ],
    cta: "Upgrade to Business",
  },
  {
    name: "Enterprise",
    priceMonthly: 0,
    priceAnnual: 0,
    messagesPerDay: "Custom",
    savedRecipes: "Unlimited",
    vectorDocs: "Unlimited",
    features: [
      "Dedicated support",
      "SLA",
      "White-label",
      "Custom integrations",
      "Unlimited seats/docs",
    ],
    cta: "Contact Sales",
  },
];

export function Pricing() {
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [loading, setLoading] = useState<string | null>(null);

  const handleSubscribe = async (tier: PricingTier) => {
    if (tier.name === "Free") {
      // Redirect to signup
      window.location.href = "/register";
      return;
    }

    if (tier.name === "Enterprise") {
      // Redirect to contact form or open email
      window.location.href = "mailto:sales@example.com";
      return;
    }

    const priceId =
      interval === "monthly" ? tier.priceIdMonthly : tier.priceIdAnnual;

    if (!priceId) {
      console.error("Price ID not configured");
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

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
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

        <div className="inline-flex items-center gap-4 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => setInterval("monthly")}
            className={`px-6 py-2 rounded-md transition-colors ${
              interval === "monthly"
                ? "bg-background shadow-sm"
                : "hover:bg-background/50"
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setInterval("annual")}
            className={`px-6 py-2 rounded-md transition-colors ${
              interval === "annual"
                ? "bg-background shadow-sm"
                : "hover:bg-background/50"
            }`}
          >
            Annual
            <Badge variant="secondary" className="ml-2">
              Save 17%
            </Badge>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {tiers.map((tier) => (
          <Card
            key={tier.name}
            className={`relative flex flex-col ${
              tier.popular ? "border-primary shadow-lg" : ""
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="default">Most Popular</Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle className="text-2xl">{tier.name}</CardTitle>
              <CardDescription>
                <div className="mt-4">
                  {tier.name === "Enterprise" ? (
                    <span className="text-3xl font-bold">Custom</span>
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
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Messages/day:</span>
                  <span className="font-medium">{tier.messagesPerDay}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Saved recipes:</span>
                  <span className="font-medium">{tier.savedRecipes}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Vector docs:</span>
                  <span className="font-medium">{tier.vectorDocs}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <ul className="space-y-2">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <CheckIcon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>

            <CardFooter>
              <Button
                className="w-full"
                variant={tier.popular ? "default" : "outline"}
                onClick={() => handleSubscribe(tier)}
                disabled={loading === tier.name}
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
