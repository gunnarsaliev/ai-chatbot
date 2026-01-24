import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/(auth)/auth";
import GradientBackground from "@/components/GradientBackground";
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";
import { ProfileAvatarUpload } from "@/components/profile-avatar-upload";
import { SubscriptionBadge } from "@/components/subscription-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getUserEntitlements } from "@/lib/ai/entitlements";
import {
  getMessageCountByUserId,
  getSubscriptionByUserId,
  getUserById,
} from "@/lib/db/queries";
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
  const [subscription, messageCount, entitlements, userData] =
    await Promise.all([
      getSubscriptionByUserId({ userId: session.user.id }),
      getMessageCountByUserId({ id: session.user.id, differenceInHours: 24 }),
      getUserEntitlements(session.user.id),
      getUserById(session.user.id),
    ]);

  const tier = (subscription?.tier || "free") as SubscriptionTier;
  const hasActiveSubscription = subscription?.status === "active";

  // Calculate usage percentages
  const maxMessagesPerDay = entitlements.maxMessagesPerDay;
  const messagePercentage =
    !maxMessagesPerDay || maxMessagesPerDay === -1
      ? 0
      : (messageCount / maxMessagesPerDay) * 100;

  // For Pro/Power users with credit system, show credits instead of message count
  const hasCredits =
    entitlements.messageCredits !== undefined &&
    entitlements.messageCredits !== -1;

  // Use new availableCredits column, fall back to metadata, then entitlements for backward compatibility
  const currentCredits =
    subscription?.availableCredits ??
    (subscription?.metadata as any)?.messageCredits ??
    entitlements.messageCredits ??
    0;
  const totalCreditsAlloted =
    subscription?.totalCredits ?? entitlements.messageCredits ?? 0;
  const usedCredits = hasCredits ? totalCreditsAlloted - currentCredits : 0;

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto p-6 gap-6">
      <GradientBackground />
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
            <ProfileAvatarUpload
              currentAvatarUrl={userData?.avatarUrl ?? undefined}
              email={session.user.email ?? "User"}
            />
            <div className="flex flex-col gap-1">
              <p className="text-lg font-semibold">{session.user.email}</p>
              <div className="flex items-center gap-2">
                <Badge className="text-xs" variant="outline">
                  {session.user.type === "guest"
                    ? "Guest Account"
                    : "Regular Account"}
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
                <span className="text-sm capitalize">
                  {subscription.billingInterval}
                </span>
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
              <Badge className="w-fit" variant="destructive">
                Subscription will cancel at period end
              </Badge>
            )}
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <ManageSubscriptionButton
              hasActiveSubscription={hasActiveSubscription}
            />
            <Button asChild variant="outline">
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
          {/* Credits or Messages */}
          {hasCredits ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Message Credits</span>
                <span className="text-sm">
                  {currentCredits} / {totalCreditsAlloted}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      (currentCredits / (totalCreditsAlloted || 1)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {usedCredits} credits used • Resets monthly
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Messages (Today)</span>
                <span className="text-sm">
                  {messageCount} /{" "}
                  {!maxMessagesPerDay || maxMessagesPerDay === -1
                    ? "∞"
                    : maxMessagesPerDay}
                </span>
              </div>
              {maxMessagesPerDay && maxMessagesPerDay !== -1 && (
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(messagePercentage, 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          <Separator />

          {/* Saved Recipes */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Saved Recipes</span>
            <span className="text-sm">
              0 /{" "}
              {entitlements.maxSavedRecipes === -1
                ? "∞"
                : entitlements.maxSavedRecipes}
            </span>
          </div>

          <Separator />

          {/* Vector Docs */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Vector Documents</span>
            <span className="text-sm">
              0 /{" "}
              {entitlements.maxVectorDocs === -1
                ? "∞"
                : entitlements.maxVectorDocs}
            </span>
          </div>

          {entitlements.teamSeats && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Team Seats</span>
                <span className="text-sm">
                  0 /{" "}
                  {entitlements.teamSeats === -1 ? "∞" : entitlements.teamSeats}
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
          <Button asChild className="justify-start" variant="outline">
            <Link href="/pricing">View Pricing Plans</Link>
          </Button>
          <Button asChild className="justify-start" variant="outline">
            <Link href="/">New Chat</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
