import { redirect } from "next/navigation";
import Image from "next/image";
import { auth } from "@/app/(auth)/auth";
import { getSubscriptionByUserId, getMessageCountByUserId } from "@/lib/db/queries";
import { getUserEntitlements } from "@/lib/ai/entitlements";
import { SubscriptionBadge } from "@/components/subscription-badge";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { SubscriptionTier } from "@/lib/stripe";

export const metadata = {
  title: "Profile",
  description: "Manage your account and subscription",
};

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user data
  const [subscription, messageCount, entitlements] = await Promise.all([
    getSubscriptionByUserId({ userId: session.user.id }),
    getMessageCountByUserId({ id: session.user.id, differenceInHours: 24 }),
    getUserEntitlements(session.user.id),
  ]);

  const tier = (subscription?.tier || "free") as SubscriptionTier;
  const hasActiveSubscription = subscription?.status === "active";

  // Calculate usage percentages
  const messagePercentage = entitlements.maxMessagesPerDay === -1
    ? 0
    : (messageCount / entitlements.maxMessagesPerDay) * 100;

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto p-6 gap-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and subscription
        </p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal details</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Image
              alt={session.user.email ?? "User Avatar"}
              className="rounded-full"
              height={64}
              src={`https://avatar.vercel.sh/${session.user.email}`}
              width={64}
            />
            <div className="flex flex-col gap-1">
              <p className="text-lg font-semibold">{session.user.email}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {session.user.type === "guest" ? "Guest Account" : "Regular Account"}
                </Badge>
                <SubscriptionBadge tier={tier} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            {hasActiveSubscription
              ? "Manage your current plan"
              : "Upgrade to unlock more features"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Plan</span>
              <span className="text-sm font-semibold capitalize">{tier}</span>
            </div>

            {subscription?.billingInterval && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Billing</span>
                <span className="text-sm capitalize">{subscription.billingInterval}</span>
              </div>
            )}

            {subscription?.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Next billing date</span>
                <span className="text-sm">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
            )}

            {subscription?.cancelAtPeriodEnd && (
              <Badge variant="destructive" className="w-fit">
                Subscription will cancel at period end
              </Badge>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <ManageSubscriptionButton hasActiveSubscription={hasActiveSubscription} />
            <Button variant="outline" asChild>
              <Link href="/pricing">View All Plans</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>Your current usage and limits</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* Messages */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Messages (Today)</span>
              <span className="text-sm">
                {messageCount} / {entitlements.maxMessagesPerDay === -1 ? "∞" : entitlements.maxMessagesPerDay}
              </span>
            </div>
            {entitlements.maxMessagesPerDay !== -1 && (
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${Math.min(messagePercentage, 100)}%` }}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Saved Recipes */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Saved Recipes</span>
            <span className="text-sm">
              0 / {entitlements.maxSavedRecipes === -1 ? "∞" : entitlements.maxSavedRecipes}
            </span>
          </div>

          <Separator />

          {/* Vector Docs */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Vector Documents</span>
            <span className="text-sm">
              0 / {entitlements.maxVectorDocs === -1 ? "∞" : entitlements.maxVectorDocs}
            </span>
          </div>

          {entitlements.teamSeats && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Team Seats</span>
                <span className="text-sm">
                  0 / {entitlements.teamSeats === -1 ? "∞" : entitlements.teamSeats}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button variant="outline" asChild className="justify-start">
            <Link href="/pricing">View Pricing Plans</Link>
          </Button>
          <Button variant="outline" asChild className="justify-start">
            <Link href="/">New Chat</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
