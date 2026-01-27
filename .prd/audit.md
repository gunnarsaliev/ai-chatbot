# Cooksa MVP - Current State vs Target State Audit Report

**Date**: January 26, 2026
**Auditor**: Claude Code
**Target Launch**: End of February 2026

---

## Executive Summary

The existing `ai-chatbot` project has a **strong foundation** with ~70% of the core infrastructure already built. Key systems like authentication, Stripe payments, database, GraphQL integration, and AI chat are operational. The main work ahead involves **adapting the existing chat system to Cooksa's recipe use case** and building food-specific features.

**Overall Status**: ✅ **On track for February launch** with focused effort on recipe-specific features.

---

## 1. Infrastructure & Core Systems

### ✅ **COMPLETED** - What's Already Built

#### 1.1 Authentication (NextAuth 5.0)
**Location**: `app/(auth)/auth.ts`, `app/(auth)/auth.config.ts`

**Status**: ✅ Fully functional
- Email/password authentication
- Guest user support (for trying without signup)
- Session management with JWT
- Avatar upload functionality
- User type tracking (guest/regular)

**Gap**: No user profile fields for Cooksa (age, height, fitness level, dietary prefs)

---

#### 1.2 Database (Drizzle ORM + Postgres)
**Location**: `lib/db/schema.ts`, `drizzle.config.ts`

**Status**: ✅ Core tables exist, need Cooksa-specific additions

**Existing Tables**:
```typescript
✅ User (id, email, password, avatarUrl, stripeCustomerId, userType)
✅ Chat (id, title, userId, visibility, createdAt)
✅ Message_v2 (id, chatId, role, parts, attachments, createdAt)
✅ Vote_v2 (chatId, messageId, isUpvoted)
✅ Document (id, title, content, kind, userId, createdAt)
✅ Suggestion (id, documentId, originalText, suggestedText)
✅ Stream (id, chatId, createdAt)
✅ Subscription (id, userId, tier, status, metadata, availableCredits, etc.)
```

**Missing Cooksa Tables**:
```typescript
❌ user_profiles (age, height, weight, fitnessLevel, dietaryPreferences, allergies, etc.)
❌ user_saved_recipes (userId, recipeSlug, savedAt)
❌ user_usage (userId, month, messagesUsed, messagesLimit, topUpBalance)
❌ problem_reports (userId, reportType, targetId, description, status)
```

**Note**: The existing `Subscription` table already has credit tracking columns (`availableCredits`, `totalCredits`), which is good for message tracking.

---

#### 1.3 Payment System (Stripe)
**Location**: `lib/stripe.ts`, `app/api/stripe/**/route.ts`, `COOKSA_PRICING_SETUP.md`

**Status**: ✅ Fully implemented and documented!

**Implemented**:
- ✅ B2C tiers: Free (100 msgs), Pro ($5/mo - 500 msgs), Power ($20/mo - 3000 msgs)
- ✅ B2B tiers: Business Free, Starter ($40), Pro ($90)
- ✅ Monthly + Annual billing with discounts
- ✅ Stripe webhook handler (`app/api/stripe/webhook/route.ts`)
- ✅ Checkout flow (`app/api/stripe/checkout/route.ts`)
- ✅ Customer portal (`app/api/stripe/portal/route.ts`)
- ✅ Buy credits endpoint (`app/api/stripe/buy-credits/route.ts`)
- ✅ Metadata-driven limits (Stripe product metadata overrides)
- ✅ User type auto-detection (individual/business)

**Gap for Cooksa MVP**:
The existing pricing uses B2C + B2B model, but **Cooksa PRD specifies B2C-only**:
- Free: 50 msgs/month, 10/day
- Pro: $5/mo - 500 msgs
- Power: $20/mo - 3000 msgs

**Action Needed**:
- Update `lib/stripe.ts` TIER_LIMITS to match Cooksa B2C pricing
- Keep B2B infrastructure dormant (can reactivate post-MVP)
- Top-ups available to Pro users only

---

#### 1.4 Entitlements & Usage Tracking
**Location**: `lib/ai/entitlements.ts`

**Status**: ✅ System exists and works!

**Implemented**:
- ✅ `getUserEntitlements(userId)` - fetches user's limits
- ✅ `checkMessageLimit(userId, count, 'day'|'month')` - validates against limits
- ✅ `checkMessageCredits(userId, required)` - for credit-based system
- ✅ Metadata override support (from Stripe)
- ✅ Guest vs Regular user tiers

**Current Limits**:
```typescript
guest: { maxMessagesPerMonth: 20, maxMessagesPerDay: 5 }
regular (free): { maxMessagesPerMonth: 100, maxMessagesPerDay: 10 }
```

**Action Needed**:
- Update free tier to 50 msgs/month (per Cooksa PRD)
- Add usage tracking per message in chat route
- Implement 80% / 100% warning dialogs in UI

---

#### 1.5 AI Integration (Vercel AI SDK)
**Location**: `app/(chat)/api/chat/route.ts`, `lib/ai/models.ts`, `lib/ai/prompts.ts`, `lib/ai/tools/`

**Status**: ✅ Core chat works, needs Cooksa customization

**Implemented**:
- ✅ Vercel AI SDK (`ai` v6.0.37)
- ✅ Multi-provider support via `lib/ai/models.ts`
- ✅ Streaming responses
- ✅ Chat persistence to database
- ✅ System prompts in `lib/ai/prompts.ts`
- ✅ Tool calling system (has 4 example tools)
- ✅ File upload support (`app/(chat)/api/files/upload/route.ts`)
- ✅ Avatar upload (`app/(chat)/api/avatar/upload/route.ts`)

**Existing AI Tools**:
```typescript
✅ get-weather.ts (example)
✅ create-document.ts
✅ update-document.ts
✅ request-suggestions.ts
```

**Missing Cooksa AI Tools**:
```typescript
❌ saveUserProfile (save onboarding data)
❌ generateRecipe (structured recipe output with Zod)
❌ analyzeIngredientImage (vision model for fridge photos)
❌ calculateNutrition (sum ingredient macros)
```

**Action Needed**:
- Replace system prompt with Cooksa personality
- Create Cooksa-specific tools
- Add vision model support for image uploads
- Integrate with Payload GraphQL for ingredients

---

#### 1.6 GraphQL Integration (Payload CMS)
**Location**: `codegen.ts`, `lib/graphql/`, `lib/gql/`

**Status**: ✅ GraphQL codegen configured, ⚠️ but schema is demo data

**Implemented**:
- ✅ `@graphql-codegen/cli` installed and configured
- ✅ Codegen points to `cooksa-api.g-saliev.workers.dev/api/graphql` (Payload on CF Workers!)
- ✅ Client setup in `lib/graphql/client.ts`
- ✅ Query examples in `lib/graphql/queries/`

**Current Schema** (demo):
```graphql
type Country {
  id: ID!
  name: String!
  capital: String
  population: Int
  image: Image
}
```

**Missing Cooksa Schema** (per basic.md plan):
```graphql
❌ Ingredient { slug, name, nutritionPer100g, category, image, ... }
❌ Recipe { slug, title, ingredients, steps, nutrition, savedCount, ... }
❌ RecipeIngredient { ingredient, quantity, unit, notes }
❌ Nutrition { calories, protein, carbs, fat, ... }
```

**Action Needed**:
1. **Update Payload CMS collections** (on Cloudflare Workers) to add Ingredient & Recipe collections
2. **Regenerate GraphQL schema** from Payload
3. **Run codegen** to generate TypeScript types
4. **Write queries**:
   - `GetIngredients` (all available ingredients)
   - `GetIngredientBySlug` (for ingredient pages)
   - `GetRecipes` (for /explore page)
   - `GetRecipeBySlug` (for recipe pages)
5. **Write mutations**:
   - `IncrementRecipeSavedCount` (when user saves)

---

#### 1.7 Model Selector
**Location**: `components/ai-elements/model-selector.tsx`

**Status**: ✅ Fully built and supports multi-provider!

**Implemented**:
- ✅ Dialog-based model selector component
- ✅ Supports 60+ providers (OpenAI, Anthropic, Google, etc.)
- ✅ Logo display for each provider
- ✅ Grouped layout (Standard vs Premium)
- ✅ Keyboard shortcuts support

**Action Needed**:
- Add cost multiplier display (e.g., "GPT-4o - 3x messages")
- Integrate into chat input area
- Default to GPT-4o mini

---

#### 1.8 UI Components (shadcn/ui)
**Location**: `components/ui/`, `app/globals.css`

**Status**: ✅ Comprehensive component library

**Implemented**:
- ✅ 30+ shadcn/ui components (Button, Dialog, Card, Input, Select, etc.)
- ✅ Tailwind CSS 4.1.13
- ✅ Dark mode support (`next-themes`)
- ✅ Framer Motion for animations
- ✅ Radix UI primitives
- ✅ `geist` font
- ✅ Responsive design classes

**Action Needed**:
- Update color theme to Cooksa (warm tones: oranges, reds, greens)
- Add branding (Cooksa logo, chef hat emoji 🍳)
- Build recipe-specific components:
  - `RecipeCard` (collapsible, interactive)
  - `IngredientLink` (clickable ingredient in recipe)
  - `SuggestionChips` (dynamic based on user profile)

---

## 2. Existing Routes & Pages

### ✅ **COMPLETED** - What Pages Exist

| Route | Status | Notes |
|-------|--------|-------|
| `/` (chat) | ✅ Built | Main chat interface with sidebar, needs Cooksa customization |
| `/chat/[id]` | ✅ Built | Individual chat threads |
| `/pricing` | ✅ Built | Pricing page with Individual/Business tabs (needs B2C-only update) |
| `/profile` | ✅ Built | User profile page (needs Cooksa fields) |
| `/explore` | ⚠️ Exists | Route exists but likely empty - needs recipe grid |

### ❌ **MISSING** - Pages to Build

| Route | Priority | Description |
|-------|----------|-------------|
| `/saved` | High | User's saved recipes page |
| `/recipe/[slug]` | High | Static recipe detail pages (SSG) |
| `/ingredient/[slug]` | Medium | Static ingredient pages (SSG) |
| `/user/[username]/recipes` | Medium | Public user profiles (opt-in) |
| `/settings/profile` | High | User profile settings (onboarding data) |

---

## 3. Feature-by-Feature Breakdown

### 3.1 Chat Interface

**Current State**: ✅ Fully functional AI chat
- ✅ Streaming responses
- ✅ Message history
- ✅ Sidebar with chat list
- ✅ Dark/light mode
- ✅ File uploads
- ✅ Markdown rendering
- ✅ Code highlighting (not needed for Cooksa)

**Missing for Cooksa**:
- ❌ Recipe card rendering (structured output)
- ❌ Suggestion chips (empty state prompts)
- ❌ Model selector in chat input
- ❌ Cooksa personality in system prompt
- ❌ Image upload specifically for ingredient detection

**Estimated Work**: 2-3 days

---

### 3.2 User Onboarding & Preferences

**Current State**: ⚠️ Basic user profiles exist
- ✅ User table with email, avatarUrl
- ✅ NextAuth session management
- ❌ No fields for: age, height, weight, fitnessLevel, dietaryPreferences, allergies, cookingSkill, etc.

**Missing for Cooksa**:
- ❌ `user_profiles` table in database
- ❌ Onboarding flow (hybrid: quick form + conversational)
- ❌ Profile settings page `/settings/profile`
- ❌ AI tool to save profile data
- ❌ Username claiming for public profiles

**Estimated Work**: 3-4 days

---

### 3.3 Recipe Generation

**Current State**: ⚠️ Has document generation, needs recipe adaptation
- ✅ Structured output with `generateObject` (used for documents)
- ✅ Tool calling system
- ❌ No recipe-specific schema or tools

**Missing for Cooksa**:
- ❌ Recipe Zod schema (title, ingredients, steps, nutrition)
- ❌ Integration with Payload to fetch available ingredients
- ❌ Nutrition calculation logic (sum ingredient macros)
- ❌ Recipe matching (AI-generated vs existing in Payload)
- ❌ RecipeCard component

**Estimated Work**: 4-5 days

---

### 3.4 Image Upload for Ingredients

**Current State**: ✅ File upload infrastructure exists
- ✅ File upload API route (`/api/files/upload`)
- ✅ Vercel Blob storage integration
- ❌ No vision model integration

**Missing for Cooksa**:
- ❌ Vision model setup (GPT-4o mini)
- ❌ Ingredient detection prompt
- ❌ Confidence-level output ("Definitely see: X, Possibly: Y")
- ❌ UI for camera capture on mobile

**Estimated Work**: 2-3 days

---

### 3.5 Recipe Saving & Favorites

**Current State**: ❌ No recipe-specific features
- ✅ Vote system exists (upvote/downvote messages)
- ❌ No recipe saving

**Missing for Cooksa**:
- ❌ `user_saved_recipes` table
- ❌ Save/unsave API routes
- ❌ `/saved` page to view saved recipes
- ❌ Increment `savedCount` in Payload via GraphQL mutation
- ❌ Star button UI in recipe cards

**Estimated Work**: 2-3 days

---

### 3.6 Explore Page & Static Pages

**Current State**: ⚠️ Route exists, needs content
- ✅ `/explore` route exists
- ❌ Likely empty or has placeholder

**Missing for Cooksa**:
- ❌ Recipe grid UI with filters (cuisine, difficulty, time, dietary)
- ❌ "Most Saved" section
- ❌ Search functionality
- ❌ Static recipe pages `/recipe/[slug]` (SSG with ISR)
- ❌ Static ingredient pages `/ingredient/[slug]` (SSG)
- ❌ Open Graph meta tags for sharing

**Estimated Work**: 4-5 days

---

### 3.7 User Profiles (Public)

**Current State**: ⚠️ Basic profile page exists
- ✅ `/profile` route
- ❌ No public user pages

**Missing for Cooksa**:
- ❌ Username claiming system
- ❌ `profilePublic` boolean field
- ❌ `/user/[username]/recipes` dynamic route
- ❌ Public profile UI (saved recipes, dietary badges, bio)
- ❌ Privacy toggle in settings

**Estimated Work**: 2-3 days

---

### 3.8 Content Moderation & Safety

**Current State**: ❌ No moderation system
- ❌ No OpenAI Moderation API integration
- ❌ No report system

**Missing for Cooksa**:
- ❌ OpenAI Moderation API calls (free)
- ❌ `problem_reports` table
- ❌ Report form UI (dialog)
- ❌ Send reports to Payload CMS for admin review
- ❌ Report button on profiles/recipes

**Estimated Work**: 1-2 days

---

### 3.9 Analytics & Monitoring

**Current State**: ⚠️ Basic analytics
- ✅ Vercel Analytics installed (`@vercel/analytics`)
- ❌ No Posthog or product analytics
- ❌ No AI cost tracking

**Missing for Cooksa**:
- ❌ Posthog integration (setup, event tracking)
- ❌ Key events:
  - `user_signed_up`, `onboarding_completed`
  - `recipe_generated`, `image_uploaded`, `recipe_saved`
  - `upgrade_clicked`, `checkout_completed`
- ❌ AI cost tracking per user (token usage → cost calculation)
- ❌ Admin dashboard for costs

**Estimated Work**: 1-2 days

---

### 3.10 Mobile & PWA

**Current State**: ⚠️ Responsive but no PWA
- ✅ Responsive design (Tailwind)
- ❌ No PWA configuration

**Missing for Cooksa**:
- ❌ `manifest.json` (app name, icons, theme color)
- ❌ Service worker (`sw.js`) for offline support
- ❌ next-pwa configuration in `next.config.ts`
- ❌ Camera capture for mobile (`<input capture="environment">`)
- ❌ Touch-optimized UI (44x44px tap targets)

**Estimated Work**: 1-2 days

---

## 4. Payload CMS (Cloudflare Workers)

**Current State**: ✅ GraphQL endpoint exists at `cooksa-api.g-saliev.workers.dev`
- ✅ Payload CMS deployed on Cloudflare Workers
- ⚠️ Has demo "Countries" collection
- ❌ Missing Cooksa collections

**Action Needed**:

### 4.1 Update Payload Collections
Add two new collections in Payload CMS:

**Collection: `ingredients`**
```typescript
{
  slug: 'ingredients',
  fields: [
    { name: 'slug', type: 'text', unique: true, required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'category', type: 'select', options: [...] },
    { name: 'nutritionPer100g', type: 'group', fields: [
      { name: 'calories', type: 'number' },
      { name: 'protein', type: 'number' },
      { name: 'carbs', type: 'number' },
      { name: 'fat', type: 'number' },
      // ... other nutrients
    ]},
    { name: 'image', type: 'upload' },
    { name: 'seasonality', type: 'text' },
    { name: 'storageTips', type: 'textarea' },
    { name: 'substitutes', type: 'array' },
    { name: 'healthBenefits', type: 'textarea' },
    { name: 'allergens', type: 'array' },
  ]
}
```

**Collection: `recipes`**
```typescript
{
  slug: 'recipes',
  fields: [
    { name: 'slug', type: 'text', unique: true, required: true },
    { name: 'title', type: 'text', required: true },
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'upload' },
    { name: 'ingredients', type: 'array', fields: [
      { name: 'ingredient', type: 'relationship', relationTo: 'ingredients' },
      { name: 'quantity', type: 'number' },
      { name: 'unit', type: 'text' },
      { name: 'notes', type: 'text' },
    ]},
    { name: 'steps', type: 'array' },
    { name: 'cookTime', type: 'number' },
    { name: 'servings', type: 'number' },
    { name: 'difficulty', type: 'select', options: ['easy', 'medium', 'hard'] },
    { name: 'tags', type: 'array' },
    { name: 'cuisine', type: 'text' },
    { name: 'nutrition', type: 'group', fields: [...] },
    { name: 'savedCount', type: 'number', defaultValue: 0 },
    { name: 'isPublished', type: 'checkbox', defaultValue: false },
  ]
}
```

**Collection: `problems`** (for reports)
```typescript
{
  slug: 'problems',
  fields: [
    { name: 'userId', type: 'text', required: true },
    { name: 'reportType', type: 'select', options: ['content', 'user', 'recipe', 'other'] },
    { name: 'targetId', type: 'text', required: true },
    { name: 'description', type: 'textarea', required: true },
    { name: 'status', type: 'select', options: ['pending', 'reviewed', 'resolved'], defaultValue: 'pending' },
  ]
}
```

### 4.2 USDA Data Import
**Action**: Create script to import 500-1000 ingredients from USDA FoodData Central API
- Fetch nutrition data (calories, protein, carbs, fat, vitamins, minerals)
- Map to Payload `ingredients` collection
- Store in Cloudflare D1 database

**Estimated Work**: 2-3 days (including script + data validation)

---

## 5. Missing Components

| Component | Priority | Description | Estimated Time |
|-----------|----------|-------------|----------------|
| `RecipeCard` | High | Rich interactive recipe display | 1 day |
| `IngredientLink` | High | Clickable ingredient → detail page | 0.5 day |
| `SuggestionChips` | High | Dynamic prompt chips based on user profile | 1 day |
| `UsageIndicator` | High | Shows remaining messages (in profile settings) | 0.5 day |
| `UpgradeDialog` | High | 80% / 100% usage warning dialog | 0.5 day |
| `OnboardingForm` | High | Quick 2-3 question modal | 1 day |
| `ProfileSettings` | High | Edit user preferences | 1 day |
| `RecipeGrid` | Medium | Grid layout for /explore | 1 day |
| `ReportDialog` | Low | Report form for moderation | 0.5 day |

**Total Component Work**: ~7-8 days

---

## 6. Updated 5-Week Timeline

Based on audit findings, here's a **refined implementation plan**:

### Week 1: Database & Payload CMS (40 hours) ✅ Partially Done
- [x] Payload CMS exists on CF Workers ✅
- [x] GraphQL codegen configured ✅
- [ ] Update Payload collections (ingredients, recipes, problems) - **4 hours**
- [ ] USDA ingredient import script - **8 hours**
- [ ] Data seeding (500-1000 ingredients) - **12 hours**
- [ ] Update Vercel Postgres schema (user_profiles, user_saved_recipes, user_usage, problem_reports) - **6 hours**
- [ ] Run migrations - **2 hours**
- [ ] Update TIER_LIMITS to Cooksa B2C pricing - **2 hours**
- [ ] Test GraphQL queries from Next.js - **4 hours**
- [ ] Write GraphQL queries/mutations for ingredients & recipes - **2 hours**

**New Total**: 40 hours (some tasks already done)

---

### Week 2: Core Chat & Recipe Generation (40 hours)
- [ ] Update system prompt (Cooksa personality) - **2 hours**
- [ ] Create Recipe Zod schema - **2 hours**
- [ ] Build `generateRecipe` tool (fetch ingredients, structured output) - **6 hours**
- [ ] Build `calculateNutrition` helper (sum ingredient macros) - **4 hours**
- [ ] Recipe card component (rich, collapsible) - **8 hours**
- [ ] Integrate recipe generation in chat route - **6 hours**
- [ ] Add ingredient links in recipe cards - **2 hours**
- [ ] Message usage tracking in chat API - **4 hours**
- [ ] Test recipe generation end-to-end - **4 hours**
- [ ] Usage indicator in UI (profile page) - **2 hours**

**Total**: 40 hours

---

### Week 3: Onboarding, Image Upload, User Features (40 hours)
- [ ] Add `user_profiles` table fields - **2 hours**
- [ ] Build `saveUserProfile` AI tool - **2 hours**
- [ ] Hybrid onboarding (quick form + conversational) - **8 hours**
- [ ] Profile settings page (`/settings/profile`) - **6 hours**
- [ ] Vision model integration (GPT-4o mini) - **6 hours**
- [ ] Image upload UI (camera capture on mobile) - **4 hours**
- [ ] Ingredient detection from images - **6 hours**
- [ ] Recipe saving system (API + DB) - **4 hours**
- [ ] `/saved` page (user's saved recipes) - **4 hours**
- [ ] Increment `savedCount` mutation - **2 hours**
- [ ] Username claiming - **2 hours**
- [ ] Dynamic suggestion chips - **4 hours**

**Total**: 50 hours (10 hours overflow into Week 4)

---

### Week 4: Discovery, Static Pages, Social (40 hours)
- [ ] `/explore` page (recipe grid, filters) - **8 hours**
- [ ] `/recipe/[slug]` static pages (SSG) - **6 hours**
- [ ] `/ingredient/[slug]` static pages (SSG) - **6 hours**
- [ ] Open Graph meta tags for sharing - **2 hours**
- [ ] `/user/[username]/recipes` profile pages - **6 hours**
- [ ] Profile public toggle - **2 hours**
- [ ] Share button + copy link - **2 hours**
- [ ] OpenAI Moderation API integration - **3 hours**
- [ ] Report system (form + Payload) - **4 hours**
- [ ] Mobile responsive polish - **2 hours**
- [ ] **Overflow from Week 3** - **10 hours**

**Total**: 51 hours (1 hour overflow into Week 5)

---

### Week 5: Billing, PWA, Polish, Launch (40 hours)
- [ ] Upgrade dialogs (80% / 100% warnings) - **3 hours**
- [ ] PWA setup (manifest, service worker) - **6 hours**
- [ ] Posthog integration - **4 hours**
- [ ] AI cost tracking per user - **4 hours**
- [ ] Error handling + edge cases - **4 hours**
- [ ] Mobile testing (camera, touch UI) - **4 hours**
- [ ] End-to-end testing (user flows) - **6 hours**
- [ ] Branding update (Cooksa logo, colors, chef hat emoji) - **3 hours**
- [ ] Deploy to Vercel + final checks - **2 hours**
- [ ] Launch preparation (legal pages, domain, etc.) - **3 hours**
- [ ] **Overflow from Week 4** - **1 hour**

**Total**: 40 hours

---

## 7. Risk Assessment

### Low Risk ✅
- **Authentication**: Already built and stable
- **Payment system**: Fully functional Stripe integration
- **Database**: Drizzle + Postgres working well
- **AI chat**: Vercel AI SDK proven and tested
- **GraphQL codegen**: Configured and functional

### Medium Risk ⚠️
- **USDA data import**: API rate limits, data quality issues
  - *Mitigation*: Start early, validate top 100 ingredients manually
- **Vision model accuracy**: GPT-4o mini may miss ingredients
  - *Mitigation*: Add confidence levels, allow user corrections
- **Recipe quality**: AI-generated recipes may be inconsistent
  - *Mitigation*: Constrain to available ingredients, test extensively
- **Payload on CF Workers**: Relatively new, potential stability issues
  - *Mitigation*: Have fallback plan (Payload on Vercel or self-hosted)

### High Risk 🚨
- **Scope creep**: Feature list is ambitious for 5 weeks
  - *Mitigation*: **Ruthlessly prioritize**. If behind schedule, cut:
    - Public user profiles → post-MVP
    - Meal planning → already deferred
    - Advanced filters on /explore → keep simple
- **Timeline slip**: 200 hours is tight for solo developer
  - *Mitigation*: Buffer time built into each week; track progress daily

---

## 8. Recommendations

### Immediate Actions (This Week)

1. **Update Payload CMS collections** (Day 1-2)
   - Add `ingredients`, `recipes`, `problems` collections
   - Regenerate GraphQL schema
   - Run codegen in Next.js project

2. **Create USDA import script** (Day 2-3)
   - Build script to fetch ingredient data
   - Start seeding 50-100 ingredients for testing
   - Full 500-1000 import can run overnight

3. **Update Vercel Postgres schema** (Day 3-4)
   - Add missing tables: `user_profiles`, `user_saved_recipes`, `user_usage`, `problem_reports`
   - Run migrations
   - Test queries

4. **Customize system prompt** (Day 4-5)
   - Write Cooksa personality prompt
   - Test in chat interface
   - Iterate based on responses

### Quick Wins 🚀

These give immediate visual progress:
- Update branding (logo, colors, chef hat emoji) - **3 hours**
- Add suggestion chips to empty chat state - **2 hours**
- Update pricing page to B2C-only - **2 hours**
- Build basic RecipeCard component - **4 hours**

### Features to Cut if Needed ✂️

If you fall behind schedule, defer these to Phase 2:
1. **Public user profiles** (`/user/[username]`) - Low priority for MVP
2. **Ingredient detail pages** - Can launch with recipes only
3. **Advanced filters on /explore** - Start with basic search
4. **PWA** - Nice to have, not critical for validation
5. **B2B pricing tiers** - Already dormant, remove from UI

---

## 9. Summary: What's Done vs What's Needed

### ✅ **Ready to Use** (~70% of infrastructure)
- NextAuth authentication
- Stripe payment system (needs pricing update)
- Database (Drizzle + Postgres)
- GraphQL codegen setup
- Vercel AI SDK + chat interface
- Model selector component
- shadcn/ui component library
- File upload infrastructure
- Entitlements system
- Message persistence
- Dark mode
- Responsive design

### ⚠️ **Needs Customization** (~20% adaptation)
- System prompt (generic → Cooksa personality)
- Database schema (add Cooksa-specific tables)
- Pricing tiers (B2C + B2B → B2C only)
- UI theme (neutral → warm orange/red/green)
- Existing routes (/explore, /profile, /pricing)

### ❌ **Build from Scratch** (~10% net new)
- Recipe generation logic
- Nutrition calculation
- Image-based ingredient detection
- Recipe card component
- Static recipe/ingredient pages
- Onboarding flow
- Saved recipes feature
- Content moderation
- PWA configuration
- Posthog analytics

---

## 10. Conclusion

**You're in a strong position!** The existing codebase provides ~70% of what Cooksa needs. The core challenge is **adapting a generic AI chatbot into a specialized food recommendation app**.

**Key Success Factors**:
1. **Focus on recipe generation quality** - This is the core value prop
2. **Get USDA data imported early** - Blocks many features
3. **Iterate on AI prompts** - System prompt makes or breaks UX
4. **Cut features aggressively if needed** - MVP over perfection

**Realistic Assessment**:
- **Base MVP** (chat + recipes + onboarding): Achievable in 3-4 weeks
- **Full feature set** (profiles, explore, static pages, PWA): Tight but possible in 5 weeks with 40 hrs/week

**Next Step**: Start with Payload CMS update and USDA import this week!

---

**Questions for You**:
1. Do you have access to update the Payload CMS on Cloudflare Workers?
2. Should we start with the USDA import script or Payload collections first?
3. Any features from the audit you want to reprioritize?
