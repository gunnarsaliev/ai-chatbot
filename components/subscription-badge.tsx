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
  creator: "default",
  business: "default",
  enterprise: "default",
};

const tierLabels: Record<SubscriptionTier, string> = {
  free: "Free",
  pro: "Pro",
  creator: "Creator",
  business: "Business",
  enterprise: "Enterprise",
};

export function SubscriptionBadge({ tier }: SubscriptionBadgeProps) {
  return (
    <Badge variant={tierColors[tier]} className="ml-2">
      {tierLabels[tier]}
    </Badge>
  );
}
