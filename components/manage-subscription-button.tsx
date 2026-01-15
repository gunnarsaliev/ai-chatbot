"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface ManageSubscriptionButtonProps {
  hasActiveSubscription: boolean;
}

export function ManageSubscriptionButton({
  hasActiveSubscription,
}: ManageSubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = async () => {
    if (!hasActiveSubscription) {
      router.push("/pricing");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error opening portal:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className="w-full"
    >
      {loading
        ? "Loading..."
        : hasActiveSubscription
          ? "Manage Subscription"
          : "Upgrade Plan"}
    </Button>
  );
}
