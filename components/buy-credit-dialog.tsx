"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BuyCreditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CREDIT_AMOUNTS = [
  { amount: 5, credits: 500, label: "$5" },
  { amount: 10, credits: 1000, label: "$10" },
  { amount: 20, credits: 2000, label: "$20" },
  { amount: 50, credits: 5000, label: "$50" },
];

export function BuyCreditDialog({ open, onOpenChange }: BuyCreditDialogProps) {
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);

    try {
      const amount = customAmount ? Number.parseFloat(customAmount) : selectedAmount;

      const response = await fetch("/api/stripe/buy-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Purchase error:", errorData);
        alert(errorData.error || "Failed to initiate purchase");
        return;
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
        alert("Failed to get checkout URL. Please try again.");
      }
    } catch (error) {
      console.error("Error purchasing credits:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const displayAmount = customAmount ? Number.parseFloat(customAmount) : selectedAmount;
  const displayCredits = customAmount
    ? Math.floor(Number.parseFloat(customAmount) * 100)
    : selectedAmount * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">Buy Message Credits</DialogTitle>
          <DialogDescription>
            Purchase credits as a one-time top-up to use for your AI Gateway
            usage. Credits expire 1 year after purchase and are only valid for
            use on AI Gateway.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          <div className="text-6xl font-bold">
            ${displayAmount.toFixed(2)}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {CREDIT_AMOUNTS.map((option) => (
              <Button
                key={option.amount}
                variant={selectedAmount === option.amount && !customAmount ? "default" : "outline"}
                onClick={() => {
                  setSelectedAmount(option.amount);
                  setCustomAmount("");
                }}
                className="min-w-[80px]"
              >
                {option.label}
              </Button>
            ))}
            <Button
              variant={customAmount ? "default" : "outline"}
              onClick={() => {
                const amount = prompt("Enter custom amount (USD):");
                if (amount && !isNaN(Number.parseFloat(amount))) {
                  setCustomAmount(amount);
                }
              }}
              className="min-w-[80px]"
            >
              Custom
            </Button>
          </div>

          <div className="w-full rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                You'll receive approximately:
              </span>
              <span className="font-semibold">
                {displayCredits.toLocaleString()} message credits
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Stackable • No expiry • Added to your balance
            </p>
          </div>

          <div className="w-full rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              <strong>Note:</strong> Top-ups are available to Pro users only. Free tier
              users should upgrade to Pro to purchase credits.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={loading || (!selectedAmount && !customAmount)}
            className="min-w-[180px]"
          >
            {loading ? "Processing..." : "Continue to Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
