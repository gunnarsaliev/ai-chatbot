# Cooksa Pricing System - Setup Guide

This guide explains how to configure and use the new Cooksa pricing system with Stripe.

## Overview

The Cooksa pricing system supports **two distinct pricing models**:

### B2C (Individual Plans)
- **Free**: 100 messages/month, 10/day cap - $0
- **Pro**: 500 messages/month - $5/month or $50/year (~17% discount)
- **Power**: 3,000 messages/month - $20/month or $200/year (~17% discount)

### B2B (Business Plans)
- **Free**: 100 message credits, 500KB storage - $0
- **Starter**: 10K message credits, 20MB storage - $40/month or $408/year (~15% discount)
- **Pro**: Unlimited credits, 60MB storage - $90/month or $918/year (~15% discount)

## Key Features

### Stripe-First Architecture
- **Metadata-driven limits**: All tier limits can be overridden via Stripe product metadata
- **Automatic user type detection**: Users are automatically flagged as "business" when subscribing to B2B plans
- **Single pricing page**: Unified `/pricing` route with Individual/Business tabs
- **Metered billing ready**: Infrastructure supports future top-up purchases via Stripe metered billing

### Database Schema
- `User.userType`: `'individual'` or `'business'` - auto-set from subscription tier
- `Subscription.metadata`: JSON field stores Stripe product metadata for limit overrides
- `Subscription.tier`: Supports 6 tiers: `free`, `pro`, `power`, `business_free`, `business_starter`, `business_pro`

## Stripe Setup Instructions

### Step 1: Create Stripe Products

Create **6 products** in your Stripe Dashboard:

#### B2C Individual Products

1. **Pro Plan**
   - Name: "Pro Plan (Individual)"
   - Monthly Price: $5/month → Save price ID
   - Annual Price: $50/year → Save price ID
   - Metadata (optional):
     ```json
     {
       "maxMessagesPerMonth": "500",
       "userType": "individual"
     }
     ```

2. **Power Plan**
   - Name: "Power Plan (Individual)"
   - Monthly Price: $20/month → Save price ID
   - Annual Price: $200/year → Save price ID
   - Metadata (optional):
     ```json
     {
       "maxMessagesPerMonth": "3000",
       "userType": "individual"
     }
     ```

#### B2B Business Products

3. **Starter Plan**
   - Name: "Starter Plan (Business)"
   - Monthly Price: $40/user/month → Save price ID
   - Annual Price: $408/user/year → Save price ID
   - Metadata (optional):
     ```json
     {
       "messageCredits": "10000",
       "finetuneStorageMB": "20",
       "aiAgentCount": "3",
       "userType": "business"
     }
     ```

4. **Pro Plan (Business)**
   - Name: "Pro Plan (Business)"
   - Monthly Price: $90/user/month → Save price ID
   - Annual Price: $918/user/year → Save price ID
   - Metadata (optional):
     ```json
     {
       "messageCredits": "-1",
       "finetuneStorageMB": "60",
       "aiAgentCount": "10",
       "userType": "business"
     }
     ```

### Step 2: Configure Environment Variables

Add the following to your `.env.local` file:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# B2C Individual Plan Price IDs
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_POWER_MONTHLY=price_...
STRIPE_PRICE_POWER_ANNUAL=price_...

# B2B Business Plan Price IDs
STRIPE_PRICE_BUSINESS_STARTER_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_STARTER_ANNUAL=price_...
STRIPE_PRICE_BUSINESS_PRO_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_PRO_ANNUAL=price_...

# Public Price IDs (for frontend)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_POWER_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_POWER_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_STARTER_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_STARTER_ANNUAL=price_...
NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_PRO_MONTHLY=price_...
NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_PRO_ANNUAL=price_...

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 3: Set Up Webhooks

#### Local Development (using Stripe CLI)

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret to .env.local
# It starts with whsec_...
```

#### Production

1. Go to **Stripe Dashboard → Developers → Webhooks**
2. Click **Add endpoint**
3. Set URL: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Signing secret** and add to production environment variables

### Step 4: Test the Integration

1. Start your development server:
   ```bash
   pnpm dev
   ```

2. Start Stripe webhook forwarding:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. Visit `http://localhost:3000/pricing`

4. Test checkout with Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Use any future expiry date, any CVC, any ZIP

5. Verify:
   - User is created in database
   - Subscription is created with correct tier
   - `User.userType` is set to `'business'` for B2B plans
   - Webhook logs show subscription metadata being stored

## How It Works

### User Type Auto-Detection

When a user subscribes to a plan, the webhook handler automatically:

1. Detects if the tier is business (starts with `'business_'`)
2. Updates `User.userType` to `'business'` or `'individual'`
3. Stores Stripe product metadata in `Subscription.metadata`

```typescript
// lib/db/schema.ts:19
userType: varchar("userType", { enum: ["individual", "business"] })
  .notNull()
  .default("individual"),
```

### Metadata-Driven Limits

The entitlements system checks for Stripe metadata overrides:

```typescript
// lib/ai/entitlements.ts:62-80
const metadata = subscription.metadata as any;

return {
  maxMessagesPerMonth: metadata?.maxMessagesPerMonth ?? limits.messagesPerMonth,
  messageCredits: metadata?.messageCredits ?? limits.messageCredits,
  // ... other limits with fallbacks
};
```

### Pricing Page Tabs

The `/pricing` page has two tabs:
- **Individual**: Shows Free, Pro ($5), Power ($20)
- **Business**: Shows Free, Starter ($40), Pro ($90)

Users can toggle between monthly and annual billing, with appropriate discounts shown.

## Customizing Limits via Stripe Metadata

You can override default limits for any tier by adding metadata to the Stripe product:

### Example: Custom Enterprise Tier

1. Create a new product in Stripe: "Enterprise Plan"
2. Add custom metadata:
   ```json
   {
     "maxMessagesPerMonth": "100000",
     "messageCredits": "50000",
     "finetuneStorageMB": "200",
     "aiAgentCount": "50",
     "teamSeats": "20"
   }
   ```
3. The application will automatically use these limits instead of defaults

### Supported Metadata Fields

- `maxMessagesPerMonth`: Total B2C messages per month
- `maxMessagesPerDay`: Daily B2C message cap
- `messageCredits`: B2B monthly message credits
- `finetuneStorageMB`: AI agent fine-tune storage in MB
- `aiAgentCount`: Number of AI agents allowed
- `maxSavedRecipes`: Maximum saved recipes
- `maxVectorDocs`: Maximum vector documents
- `teamSeats`: Number of team members

## API Endpoints

### POST /api/stripe/checkout
Creates a Stripe checkout session for any plan.

**Request:**
```json
{
  "priceId": "price_..."
}
```

**Response:**
```json
{
  "url": "https://checkout.stripe.com/..."
}
```

### POST /api/stripe/webhook
Handles Stripe webhook events:
- `checkout.session.completed` - Creates subscription after successful checkout
- `customer.subscription.updated` - Syncs subscription changes
- `customer.subscription.deleted` - Downgrades to free tier
- `invoice.payment_failed` - Updates subscription status

### POST /api/stripe/portal
Creates a Stripe Customer Portal session for subscription management.

## Message Tracking

### B2C (Individual Plans)
Messages are tracked monthly with optional daily caps:

```typescript
// Check monthly limit
const monthlyCount = await getMessageCountByUserId({
  id: userId,
  differenceInHours: 24 * 30, // 30 days
});

const { allowed } = await checkMessageLimit(userId, monthlyCount, "month");
```

### B2B (Business Plans)
Messages use credit-based system (future implementation):

```typescript
// Check credit balance
const entitlements = await getUserEntitlements(userId);
const creditsRemaining = entitlements.messageCredits - creditsUsed;
```

## Production Checklist

Before going live:

- [ ] Switch Stripe to live mode
- [ ] Update all environment variables with live keys and price IDs
- [ ] Configure live webhook endpoint in Stripe Dashboard
- [ ] Test complete checkout flow with real payment method
- [ ] Verify user type is set correctly for business subscriptions
- [ ] Enable Stripe Customer Portal for subscription management
- [ ] Set up Stripe tax collection if required
- [ ] Configure billing email settings in Stripe

## Troubleshooting

### User type not updating
- Check webhook logs: `console.log` statements in `app/api/stripe/webhook/route.ts`
- Verify Stripe webhook secret is correct
- Ensure price ID is mapped in `lib/stripe.ts` `getPriceDetails()`

### Metadata not saving
- Check Stripe product has metadata configured
- Verify webhook is fetching product with `expand: ["product"]`
- Check database migration ran: `pnpm db:migrate`

### Checkout session failing
- Verify price IDs in `.env.local` match Stripe Dashboard
- Check that `NEXT_PUBLIC_` prefixed variables are set for client-side use
- Ensure Stripe secret key has permissions for checkout

## Future Enhancements

### Top-Up Credits (B2C)
For Pro tier users to purchase additional message credits:

1. Create a one-time payment product in Stripe
2. Add metadata: `{ "creditAmount": "500", "isTopUp": "true" }`
3. Handle `checkout.session.completed` for mode='payment'
4. Increment `topupCreditsAvailable` field in user entitlements

### Metered Billing
Switch to Stripe's metered billing for usage-based pricing:

1. Create metered products with `usage_type: 'metered'`
2. Report usage via Stripe API: `stripe.subscriptionItems.createUsageRecord()`
3. Stripe automatically bills based on usage at period end

## Support

For Stripe-specific issues:
- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Support](https://support.stripe.com/)

For implementation questions:
- Check webhook logs in Stripe Dashboard
- Review server console logs for errors
- Verify environment variables are set correctly
