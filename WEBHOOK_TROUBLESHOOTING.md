# Stripe Webhook Troubleshooting Guide

## Current Issue
✅ Payments are successful
✅ User has Stripe customer ID: `cus_TnY0NqhALX5UI3`
❌ Subscriptions are NOT being saved to database
❌ Getting 307 redirect on webhook endpoint

## Root Cause
The webhook is being redirected (307) instead of processing the request. This prevents Stripe from confirming the webhook was received, so subscriptions aren't saved.

---

## Fix Checklist

### 1. ✅ Deploy Updated Webhook Handler
The webhook route has been updated with:
- Runtime configuration (`force-dynamic`, `nodejs`)
- Better logging
- GET endpoint for testing

**Action Required:**
```bash
git add .
git commit -m "Fix webhook 307 redirect and add logging"
git push
```

### 2. ⚠️ Verify Stripe Dashboard Webhook Configuration

Go to: **Stripe Dashboard → Developers → Webhooks**

**Check:**
- [ ] Endpoint URL uses **HTTPS** (not HTTP): `https://yourdomain.com/api/stripe/webhook`
- [ ] Events are selected:
  - [ ] `checkout.session.completed`
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_failed`
- [ ] Webhook status is "Enabled"

### 3. ⚠️ Update Production Environment Variables

Make sure these are set in your **production** environment (Vercel/hosting platform):

```bash
STRIPE_SECRET_KEY=sk_live_...           # Use LIVE key for production
STRIPE_WEBHOOK_SECRET=whsec_...          # Get from webhook endpoint settings
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_CREATOR_MONTHLY=price_...
STRIPE_PRICE_CREATOR_ANNUAL=price_...
STRIPE_PRICE_BUSINESS_MONTHLY=price_...
STRIPE_PRICE_BUSINESS_ANNUAL=price_...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 4. Test Webhook Endpoint

After deploying, test that the endpoint is accessible:

```bash
curl https://yourdomain.com/api/stripe/webhook
```

Expected response:
```json
{
  "message": "Stripe webhook endpoint is active",
  "timestamp": "2026-01-15T..."
}
```

If you get a redirect, there's a routing issue.

### 5. Resend Test Webhook from Stripe

Once deployed and configured:

1. Go to **Stripe Dashboard → Developers → Events**
2. Find a recent `checkout.session.completed` event
3. Click on the event
4. Click **"Send test webhook"**
5. Select your webhook endpoint
6. Click **"Send test webhook"**

### 6. Check Logs

After sending test webhook, check your production logs for:

```
[Webhook] Received event: checkout.session.completed
[handleSubscriptionUpdate] Processing subscription
[handleSubscriptionUpdate] Found user
[handleSubscriptionUpdate] Successfully upserted subscription
```

If you see errors, they'll tell you exactly what's wrong.

---

## Common Issues & Solutions

### Issue: 307 Redirect Persists

**Cause:** Vercel/Next.js is redirecting the route

**Solution:**
- Ensure you're using `https://` in Stripe webhook URL
- Check if you have a custom domain that's redirecting
- Verify no middleware is intercepting the route

### Issue: "No user found for Stripe customer"

**Cause:** Customer was created in Stripe checkout but user isn't in your database

**Solution:** User must be logged in when clicking "Subscribe" button

### Issue: "Unknown price ID"

**Cause:** Price ID in Stripe doesn't match environment variables

**Solution:** Double-check price IDs match exactly between:
- Stripe Dashboard products
- Production environment variables (without `NEXT_PUBLIC_` prefix)

### Issue: "Webhook signature verification failed"

**Cause:** Wrong webhook secret or body parsing issue

**Solution:**
- Copy the correct webhook secret from Stripe Dashboard
- Ensure `STRIPE_WEBHOOK_SECRET` is set in production
- The webhook route is now configured to handle raw body correctly

---

## Manual Sync (If Needed)

If subscription exists in Stripe but not in database, run:

```bash
npx tsx scripts/sync-stripe-subscription.ts <stripe-customer-id>
```

(Script not created yet - let me know if you need this)

---

## Verification Steps

After deployment:

1. Visit: `https://yourdomain.com/api/stripe/webhook`
   - Should return JSON (not redirect)

2. Check Stripe webhook logs:
   - Go to: Stripe Dashboard → Developers → Webhooks → [Your endpoint]
   - Click "Recent events"
   - Check for successful (200) responses

3. Make a test subscription:
   - Go to `/pricing`
   - Click subscribe
   - Complete payment
   - Check production logs for webhook processing
   - Verify subscription appears in database

4. Run debug script:
   ```bash
   npx tsx scripts/debug-subscriptions.ts
   ```
   Should show your subscription in the database

---

## Need Help?

If issues persist:
1. Share the full error from production logs
2. Share the webhook event from Stripe Dashboard → Events
3. Check if subscription exists in Stripe Dashboard for customer `cus_TnY0NqhALX5UI3`
