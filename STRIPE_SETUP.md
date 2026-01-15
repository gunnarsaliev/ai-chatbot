# Stripe Subscription Setup Guide

This guide will walk you through setting up Stripe subscriptions for your AI chatbot application.

## Overview

The subscription system supports 5 tiers:
- **Free**: 50 messages/day, 5 saved recipes, 50 vector docs
- **Pro**: $8/month or $80/year - 500 messages/day, unlimited recipes, 1K vector docs
- **Creator**: $20/month or $200/year - 2K messages/day, unlimited recipes, 5K vector docs
- **Business**: $50/month or $500/year - 10K messages/day, unlimited everything, 3 team seats
- **Enterprise**: Custom pricing - unlimited everything

## 1. Stripe Account Setup

### Create a Stripe Account
1. Go to [stripe.com](https://stripe.com) and sign up
2. Complete account verification
3. Enable test mode for development

### Get API Keys
1. Navigate to **Developers > API keys** in Stripe Dashboard
2. Copy your **Secret key** (starts with `sk_test_` or `sk_live_`)
3. Copy your **Publishable key** (starts with `pk_test_` or `pk_live_`)

## 2. Create Products in Stripe Dashboard

### Create Subscription Products

For each tier (Pro, Creator, Business), create a product:

1. Go to **Products** in Stripe Dashboard
2. Click **Add product**
3. Fill in details:
   - **Name**: Pro Plan (or Creator Plan, Business Plan)
   - **Description**: Add features description
   - **Pricing**: Create two prices for each product
     - Monthly price (e.g., $8/month)
     - Annual price (e.g., $80/year)
   - **Billing period**: Set to "Recurring"
   - **Payment type**: Set to "Subscription"

4. After creating each price, copy the **Price ID** (starts with `price_`)

You should have 6 price IDs total:
- `price_xxx` - Pro Monthly
- `price_xxx` - Pro Annual
- `price_xxx` - Creator Monthly
- `price_xxx` - Creator Annual
- `price_xxx` - Business Monthly
- `price_xxx` - Business Annual

## 3. Configure Stripe Billing Portal

The Customer Portal allows users to manage their subscriptions:

1. Go to **Settings > Billing > Customer portal** in Stripe Dashboard
2. Enable the Customer Portal
3. Configure settings:
   - Allow customers to **update payment methods**
   - Allow customers to **cancel subscriptions**
   - Allow customers to **switch plans** (optional)
4. Save changes

## 4. Environment Variables

Update your `.env.local` file with the following variables:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Stripe Price IDs
STRIPE_PRICE_PRO_MONTHLY=price_xxx
STRIPE_PRICE_PRO_ANNUAL=price_xxx
STRIPE_PRICE_CREATOR_MONTHLY=price_xxx
STRIPE_PRICE_CREATOR_ANNUAL=price_xxx
STRIPE_PRICE_BUSINESS_MONTHLY=price_xxx
STRIPE_PRICE_BUSINESS_ANNUAL=price_xxx

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 5. Run Database Migration

Run the migration to create the subscription tables:

```bash
pnpm db:migrate
```

This will create:
- `Subscription` table to track user subscriptions
- Add `stripeCustomerId` field to `User` table

## 6. Set Up Stripe Webhooks

Webhooks allow Stripe to notify your app about subscription changes.

### For Local Development (using Stripe CLI)

1. Install Stripe CLI:
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Copy the webhook signing secret (starts with `whsec_`) and add to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   ```

### For Production

1. Go to **Developers > Webhooks** in Stripe Dashboard
2. Click **Add endpoint**
3. Set endpoint URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Signing secret** and add to production environment variables

## 7. Test the Integration

### Test Checkout Flow

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Navigate to `/pricing` in your browser
3. Click on a plan to subscribe
4. Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Requires authentication: `4000 0025 0000 3155`
   - Declined: `4000 0000 0000 9995`
   - Use any future expiry date, any CVC, any ZIP

### Test Customer Portal

1. After subscribing, the user should see a "Manage Subscription" button
2. Clicking it should redirect to Stripe Customer Portal
3. Users can update payment methods, cancel, or change plans

### Test Webhooks

With Stripe CLI running, complete a test checkout. You should see:
1. Webhook events logged in the CLI
2. Subscription created in your database
3. User's tier updated

## 8. API Endpoints

The following API routes are available:

- **POST /api/stripe/checkout** - Create checkout session
  - Body: `{ priceId: "price_xxx" }`
  - Returns: `{ url: "https://checkout.stripe.com/..." }`

- **POST /api/stripe/portal** - Create customer portal session
  - Returns: `{ url: "https://billing.stripe.com/..." }`

- **POST /api/stripe/webhook** - Handle Stripe webhooks
  - Receives events from Stripe
  - Syncs subscription status to database

## 9. Usage in Your App

### Check User's Subscription

```typescript
import { getUserEntitlements } from "@/lib/ai/entitlements";

const entitlements = await getUserEntitlements(userId);
console.log(entitlements.maxMessagesPerDay); // 50, 500, 2000, etc.
```

### Enforce Message Limits

```typescript
import { checkMessageLimit } from "@/lib/ai/entitlements";

const messageCount = await getMessageCountByUserId({
  id: userId,
  differenceInHours: 24
});

const { allowed, limit, remaining } = await checkMessageLimit(
  userId,
  messageCount
);

if (!allowed) {
  throw new Error(`Message limit exceeded. Upgrade to send more messages.`);
}
```

### Display Subscription Badge

```typescript
import { SubscriptionBadge } from "@/components/subscription-badge";
import { getSubscriptionByUserId } from "@/lib/db/queries";

const subscription = await getSubscriptionByUserId({ userId });
const tier = subscription?.tier || "free";

<SubscriptionBadge tier={tier} />
```

### Manage Subscription Button

```typescript
import { ManageSubscriptionButton } from "@/components/manage-subscription-button";

const hasActiveSubscription = subscription?.status === "active";

<ManageSubscriptionButton hasActiveSubscription={hasActiveSubscription} />
```

## 10. Production Checklist

Before going live:

- [ ] Switch from test mode to live mode in Stripe Dashboard
- [ ] Update environment variables with live API keys
- [ ] Configure live webhook endpoint in Stripe Dashboard
- [ ] Test the complete flow with real payment methods
- [ ] Set up proper error handling and logging
- [ ] Configure customer email notifications in Stripe
- [ ] Review Stripe's compliance requirements
- [ ] Set up tax collection if required
- [ ] Configure billing email settings

## Troubleshooting

### Webhook signature verification failed
- Ensure `STRIPE_WEBHOOK_SECRET` is correctly set
- Check that the webhook endpoint URL is correct
- Verify webhook events are being sent to the right endpoint

### Subscription not updating after checkout
- Check webhook logs in Stripe Dashboard
- Verify webhook is reaching your server (check server logs)
- Ensure database migration was run successfully

### Customer portal not working
- Verify Customer Portal is enabled in Stripe Dashboard
- Check that user has a `stripeCustomerId` in database
- Ensure API route is returning valid portal session URL

## Support

For Stripe-specific issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)

For implementation issues:
- Check server logs for errors
- Review Stripe webhook event logs
- Verify environment variables are set correctly
