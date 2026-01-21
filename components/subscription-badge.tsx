"use client";

import { Badge } from "@/components/ui/badge";
import type { SubscriptionTier } from "@/lib/stripe";

interface SubscriptionBadgeProps {
  tier: SubscriptionTier;
}

const tierColors: Record<
  SubscriptionTier,
  "default" | "secondary" | "destructive" | "outline"
> = {
  free: "secondary",
  pro: "default",
  power: "default",
  business_free: "secondary",
  business_starter: "default",
  business_pro: "default",
};

const tierLabels: Record<SubscriptionTier, string> = {
  free: "Free",
  pro: "Pro",
  power: "Power",
  business_free: "Business Free",
  business_starter: "Business Starter",
  business_pro: "Business Pro",
};

export function SubscriptionBadge({ tier }: SubscriptionBadgeProps) {
  return (
    <Badge variant={tierColors[tier]} className="ml-2">
      {tierLabels[tier]}
    </Badge>
  );
}
