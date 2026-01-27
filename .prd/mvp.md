# Cooksa MVP - Detailed Implementation Plan

**Launch Target**: End of February 2026 (~5 weeks)
**Development Time**: 40 hours/week (solo)
**Goal**: Launch B2C SaaS product with monetization

---

## Executive Summary

Cooksa is a mobile-first, AI-powered food recommendation chatbot that provides personalized recipe suggestions, nutrition tracking, and ingredient-based meal ideas. The MVP focuses on core chat functionality, image-based ingredient detection, and a social discovery layer with shareable recipe pages.

**Key Differentiators**:
- Accurate nutrition via ingredient-level macro calculations
- Hybrid AI generation + curated recipe database
- Social features with public profiles and recipe sharing
- Tiered pricing with transparent message-based limits

---

## Technical Architecture

### Frontend/Backend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Theme**: Warm tones (oranges, reds, greens)
- **Branding**: "Cooksa" with chef hat emoji (🍳)
- **Platform**: Mobile-first responsive + PWA

### Data Layer

**User Data (Vercel Postgres + Drizzle ORM)**:
- User profiles (auth, preferences, goals)
- Chat history and messages
- Message usage tracking (billing)
- Saved recipes (user_saved_recipes join table)
- Problem reports

**Content Data (Payload CMS on Cloudflare Workers)**:
- Ingredients collection (~500-1000 items)
- Recipes collection (curated)
- GraphQL API with codegen
- Admin UI for content management

### Authentication
- **Provider**: NextAuth (already configured)
- **Features**: Email/password, OAuth providers
- **Session**: User ID linked to profiles and usage tracking

### AI Integration
- **SDK**: Vercel AI SDK (`ai` package)
- **Primary Model**: GPT-4o mini (default)
- **Premium Models**: GPT-4o, Claude 3.5 Sonnet, Gemini Pro (2-3x cost)
- **Features**:
  - Streaming responses (`streamText`)
  - Structured output (`generateObject` + Zod)
  - Tool calling (save profile, calculate macros)
  - Vision support (image uploads)
  - Model selector in chat area

### External APIs
- **USDA FoodData Central**: Ingredient nutrition data import (free)
- **OpenAI Moderation API**: Content safety (free)
- **Stripe**: Payment processing (already integrated)

### Analytics & Monitoring
- **Product Analytics**: Posthog (user flows, retention, conversions)
- **Cost Tracking**: Custom tracking per user for AI usage
- **Error Monitoring**: Optional (Sentry, Vercel)

---

## Data Models

### Vercel Postgres Schema (Drizzle)

```typescript
// users table (handled by NextAuth)
users {
  id: string (PK)
  email: string
  name: string
  image: string
  username: string (unique, nullable) // custom username
  profilePublic: boolean (default: false)
  createdAt: timestamp
}

// user_profiles table
user_profiles {
  id: string (PK)
  userId: string (FK -> users.id)
  age: number (nullable)
  height: number (nullable) // cm
  weight: number (nullable) // kg
  fitnessLevel: enum ['sedentary', 'active', 'very_active']
  dietaryPreferences: json // ['vegan', 'gluten-free', etc.]
  allergies: json // ['peanuts', 'dairy', etc.]
  cookingSkill: enum ['beginner', 'intermediate', 'advanced']
  timePreference: enum ['quick', 'moderate', 'elaborate']
  goals: json // ['budget-friendly', 'high-protein', etc.]
  onboardingCompleted: boolean (default: false)
  updatedAt: timestamp
}

// messages table (chat history)
messages {
  id: string (PK)
  chatId: string
  userId: string (FK)
  role: enum ['user', 'assistant', 'system']
  content: text
  modelUsed: string // 'gpt-4o-mini', 'claude-3.5-sonnet', etc.
  messageCost: number // multiplier (1x, 2x, 3x)
  hasImage: boolean (default: false)
  createdAt: timestamp
}

// user_usage table (billing tracking)
user_usage {
  id: string (PK)
  userId: string (FK)
  month: string // 'YYYY-MM'
  messagesUsed: number
  messagesLimit: number
  tier: enum ['free', 'pro', 'power']
  topUpBalance: number (default: 0) // unused top-ups reset monthly
  lastResetAt: timestamp
}

// user_saved_recipes table
user_saved_recipes {
  id: string (PK)
  userId: string (FK)
  recipeSlug: string // Payload recipe slug
  savedAt: timestamp
}

// problem_reports table
problem_reports {
  id: string (PK)
  userId: string (FK)
  reportType: enum ['content', 'user', 'recipe', 'other']
  targetId: string // user ID, recipe slug, etc.
  description: text
  status: enum ['pending', 'reviewed', 'resolved']
  createdAt: timestamp
}
```

### Payload CMS Schema (GraphQL)

```graphql
type Ingredient {
  id: ID!
  slug: String! @unique
  name: String!
  category: String # "protein", "vegetable", "grain", etc.
  nutritionPer100g: Nutrition!
  commonUnit: String # "cup", "piece", "tbsp"
  unitWeight: Float # grams per common unit
  image: String # URL
  seasonality: String
  storageTips: String
  substitutes: [String]
  healthBenefits: String
  allergens: [String]
  createdAt: DateTime
  updatedAt: DateTime
}

type Nutrition {
  calories: Float!
  protein: Float!
  carbs: Float!
  fat: Float!
  fiber: Float
  sugar: Float
  sodium: Float
  vitamins: JSON # {"vitaminC": 20, "vitaminA": 15}
  minerals: JSON
}

type Recipe {
  id: ID!
  slug: String! @unique
  title: String!
  description: String
  image: String # URL
  ingredients: [RecipeIngredient!]!
  steps: [String!]!
  cookTime: Int # minutes
  prepTime: Int
  servings: Int!
  difficulty: String # "easy", "medium", "hard"
  tags: [String] # ["vegetarian", "quick", "high-protein"]
  cuisine: String
  nutrition: Nutrition! # pre-calculated
  tips: [String]
  savedCount: Int! @default(0) # incremented when users save
  author: String # "Cooksa Team", user attribution later
  isPublished: Boolean! @default(false)
  createdAt: DateTime
  updatedAt: DateTime
}

type RecipeIngredient {
  ingredient: Ingredient!
  quantity: Float!
  unit: String!
  notes: String # "diced", "optional", etc.
}
```

---

## Core Features

### 1. Chat Interface

**Base Implementation**:
- Route: `app/(chat)/page.tsx`
- API: `app/api/chat/route.ts`
- Streaming responses with Vercel AI SDK
- Message history persistence
- Context-aware multi-turn conversations

**UI Components**:
- Chat message bubbles (user/assistant)
- Model selector dropdown (in chat input area)
- Image upload button (single photo)
- Loading states with streaming indicators
- Error handling with retry
- Suggestion chips (dynamic based on user profile)

**System Prompt** (example):
```
You are Cooksa 🍳, a friendly and enthusiastic cooking companion. Your personality:
- Warm and casual (use moderate emojis, add humor/puns)
- Knowledgeable but not pretentious
- Ask clarifying questions when needed
- Encourage users and make cooking approachable

Your capabilities:
1. Generate personalized recipes using ONLY ingredients from the available database
2. Analyze uploaded images to identify ingredients
3. Calculate accurate nutrition by summing ingredient macros
4. Adapt to user preferences (dietary, skill level, time, budget)

Rules:
- ALWAYS use ingredients that exist in the database (fetch from Payload GraphQL API)
- If a requested ingredient is unavailable, suggest similar alternatives from available ingredients
- Calculate nutrition by summing individual ingredient macros (don't estimate)
- Format recipes using the RecipeSchema (Zod) for structured output
- Ask for user preferences if profile is incomplete
- Be conversational during onboarding (one question at a time)
```

**Suggestion Chips System**:
- 20-30 pre-written prompts stored in config
- Categories: time-based, budget, nutrition, dietary, skill, meal-type, cuisine, ingredient, mood
- Filter/display 4-6 relevant chips based on user profile JSON
- Refresh when user goals/preferences change
- Examples:
  - Budget + High-protein user: "Budget high-protein dinner", "Cheap muscle-building meals"
  - Vegan + Quick user: "15-min vegan recipes", "Quick plant-based lunch"

### 2. User Onboarding & Preferences

**Flow Design** (Hybrid):

**Step 1: Quick Form** (optional, skip-able)
- Modal on first visit
- 2-3 key questions:
  1. Dietary preferences (checkboxes: vegan, vegetarian, gluten-free, dairy-free, etc.)
  2. Allergies (text input with suggestions)
  3. "Skip for now" button

**Step 2: Conversational AI**
- If profile incomplete, AI asks naturally in chat:
  - "Let's personalize your experience! First up - how old are you? (Don't worry, I won't tell anyone 😉)"
  - "What's your fitness level? Sedentary, active, or very active?"
  - "Height and weight? (Helps me calculate portion sizes)"
  - "How much time do you usually have for cooking?"
  - "What's your cooking skill level?"

**Storage**:
- Save to `user_profiles` table via AI tool calling
- Tool: `saveUserProfile(data: Partial<UserProfile>)`
- Set `onboardingCompleted: true` when all core fields filled

**Profile Updates**:
- Dedicated `/settings/profile` page for editing
- AI detects changes mid-conversation:
  - User: "I'm vegan now"
  - AI: "Got it! I've updated your profile to vegan. Want me to suggest some plant-based recipes?"

**Personalization Logic**:
- Adjust recipe complexity based on skill level
- Filter ingredients by dietary preferences/allergies
- Suggest calorie targets based on age/height/weight/fitness
- Prioritize "quick" recipes if timePreference is "quick"
- Highlight budget-friendly recipes if goals include "budget-friendly"

### 3. Image Upload for Ingredients

**Implementation**:
- File upload button in chat input (camera icon 📸)
- Accept: JPEG, PNG, WebP
- Max size: 4MB (OpenAI limit)
- Single photo per message
- Preview thumbnail before sending

**Vision Model Integration**:
- Send to GPT-4o mini (vision-enabled)
- Prompt:
  ```
  Analyze this image and identify visible food ingredients with confidence levels.

  Format:
  **Definitely see**: [high-confidence ingredients]
  **Possibly see**: [medium-confidence ingredients]

  Then suggest 2-3 recipes using these ingredients. Only use ingredients from the available database (fetch via GraphQL).
  ```

**User Flow**:
1. User uploads fridge photo
2. AI responds:
   ```
   I spotted: chicken breast, red bell peppers, onions, rice 🍗🌶️🧅
   Possibly: garlic?

   Here are 3 recipes you can make right now...
   [Recipe cards]
   ```
3. User can correct: "No garlic, but I have soy sauce"
4. AI adjusts suggestions

**Error Handling**:
- Blurry image → Ask clarifying questions: "Is that chicken or pork?"
- If still unclear → "Could you upload a clearer photo?"
- No food detected → "I don't see any ingredients. Try a closer shot of your fridge or pantry!"

### 4. Recipe Generation & Output

**Generation Flow**:

1. **Fetch Available Ingredients** (GraphQL query to Payload):
   ```graphql
   query GetIngredients {
     ingredients {
       id
       slug
       name
       nutritionPer100g { calories protein carbs fat }
       commonUnit
       unitWeight
     }
   }
   ```

2. **AI Tool**: `generateRecipe(userQuery: string, availableIngredients: Ingredient[])`
   - AI generates recipe using ONLY available ingredients
   - If ingredient missing → find substitute from available list
   - Use `generateObject` with Zod schema for structured output

3. **Recipe Schema** (Zod):
   ```typescript
   const RecipeSchema = z.object({
     title: z.string(),
     description: z.string().optional(),
     ingredients: z.array(z.object({
       ingredientSlug: z.string(), // must match Payload ingredient
       quantity: z.number(),
       unit: z.string(),
       notes: z.string().optional(),
     })),
     steps: z.array(z.string()),
     cookTime: z.number(), // minutes
     prepTime: z.number().optional(),
     servings: z.number(),
     difficulty: z.enum(['easy', 'medium', 'hard']),
     tags: z.array(z.string()),
     tips: z.array(z.string()).optional(),
   })
   ```

4. **Nutrition Calculation**:
   ```typescript
   async function calculateNutrition(recipe: Recipe) {
     let totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 }

     for (const item of recipe.ingredients) {
       const ingredient = await getIngredientFromPayload(item.ingredientSlug)
       const grams = convertToGrams(item.quantity, item.unit, ingredient.unitWeight)
       const multiplier = grams / 100 // nutrition is per 100g

       totalNutrition.calories += ingredient.nutritionPer100g.calories * multiplier
       totalNutrition.protein += ingredient.nutritionPer100g.protein * multiplier
       totalNutrition.carbs += ingredient.nutritionPer100g.carbs * multiplier
       totalNutrition.fat += ingredient.nutritionPer100g.fat * multiplier
     }

     return {
       total: totalNutrition,
       perServing: Object.fromEntries(
         Object.entries(totalNutrition).map(([k, v]) => [k, v / recipe.servings])
       )
     }
   }
   ```

**Recipe Matching** (AI-generated vs. Payload):
- Check if generated recipe matches existing Payload recipe (by title similarity or ingredients)
- If exact match → use Payload recipe (includes image, savedCount)
- If new combination → calculate nutrition on-the-fly, no image

**Recipe Card Component** (`components/recipe-card.tsx`):

**Layout**:
```
┌─────────────────────────────────────┐
│ [Image - only if Payload recipe]   │
├─────────────────────────────────────┤
│ 🍳 Chicken Stir-Fry                │
│ ⏱️ 20 min | 🍽️ 2 servings | 💪 Easy│
│ ⭐ 127 saves                         │
├─────────────────────────────────────┤
│ 📋 Ingredients [Collapse/Expand]   │
│ • 200g [chicken breast] ←link      │
│ • 1 [bell pepper] ←link            │
│ • 2 tbsp [soy sauce] ←link         │
├─────────────────────────────────────┤
│ 📝 Steps [Collapse/Expand]         │
│ 1. Cut chicken into cubes...       │
│ 2. Heat pan with oil...            │
├─────────────────────────────────────┤
│ 📊 Nutrition (per serving)         │
│ ┌─────────────────────────┐       │
│ │ Calories: 320           │       │
│ │ Protein: 35g            │       │
│ │ Carbs: 12g              │       │
│ │ Fat: 8g                 │       │
│ └─────────────────────────┘       │
├─────────────────────────────────────┤
│ 💡 Tips [Collapse/Expand]          │
│ • Marinate chicken for 30 min...  │
├─────────────────────────────────────┤
│ [⭐ Save] [🔗 Share] [⚙️ Adjust]   │
└─────────────────────────────────────┘
```

**Features**:
- Collapsible sections (ingredients, steps, tips)
- Ingredient names are links → `/ingredient/[slug]`
- Save button → increment `savedCount` in Payload, add to user's saved recipes
- Share button → copy link to `/recipe/[slug]` (if Payload recipe)
- Adjust servings → recalculate quantities/nutrition client-side

### 5. Static Pages (SEO & Sharing)

#### `/ingredient/[slug]` - Ingredient Detail Pages

**Generation**: Static Site Generation (SSG) at build time via `generateStaticParams`

**Content** (comprehensive - Options B + C):
```typescript
export default function IngredientPage({ params }: { params: { slug: string } }) {
  const ingredient = await getIngredientFromPayload(params.slug)

  return (
    <div>
      <h1>{ingredient.name}</h1>
      <Image src={ingredient.image} alt={ingredient.name} />

      {/* Nutrition Focus */}
      <NutritionTable data={ingredient.nutritionPer100g} />
      <HealthBenefits text={ingredient.healthBenefits} />
      <AllergenInfo list={ingredient.allergens} />

      {/* Comprehensive Info */}
      <SeasonalityBadge season={ingredient.seasonality} />
      <StorageTips text={ingredient.storageTips} />
      <Substitutes list={ingredient.substitutes} />

      {/* Related Recipes */}
      <RelatedRecipes ingredientSlug={ingredient.slug} />
    </div>
  )
}

export async function generateStaticParams() {
  const ingredients = await getAllIngredientsFromPayload()
  return ingredients.map(i => ({ slug: i.slug }))
}
```

**Revalidation**: ISR with revalidate every 24 hours (ingredient data rarely changes)

#### `/recipe/[slug]` - Recipe Detail Pages

**Generation**: SSG for Payload recipes only (curated content)

**Content**:
- Full recipe card (same as chat, but standalone page)
- Author attribution
- Save count (social proof)
- Related recipes
- Share buttons (Twitter, Facebook, copy link)
- CTA: "Get personalized recipes like this" → signup

**Open Graph Meta**:
```typescript
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const recipe = await getRecipeFromPayload(params.slug)

  return {
    title: `${recipe.title} | Cooksa`,
    description: recipe.description,
    openGraph: {
      title: recipe.title,
      description: recipe.description,
      images: [recipe.image],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: recipe.title,
      description: recipe.description,
      images: [recipe.image],
    }
  }
}
```

#### `/explore` - Recipe Discovery Page

**Layout**:
- Hero section with search bar
- Filter/sort controls (cuisine, difficulty, time, dietary tags)
- Grid of recipe cards (curated Payload recipes)
- "Most Saved" section (sort by savedCount DESC)
- "Recently Added" section

**Data Fetching**:
```graphql
query GetRecipes($filters: RecipeFilters, $limit: Int, $sort: String) {
  recipes(
    where: { isPublished: { equals: true }, ...$filters }
    limit: $limit
    sort: $sort
  ) {
    slug
    title
    description
    image
    cookTime
    difficulty
    tags
    savedCount
    nutrition { calories protein carbs fat }
  }
}
```

**Filters**: Client-side filtering + URL params for shareability (`/explore?cuisine=italian&difficulty=easy`)

#### `/user/[username]/recipes` - User Profile Pages

**Privacy**: Only accessible if user has `profilePublic: true`

**Content**:
```typescript
export default function UserProfilePage({ params }: { params: { username: string } }) {
  const user = await getUserByUsername(params.username)
  const savedRecipes = await getUserSavedRecipes(user.id)

  if (!user.profilePublic) {
    return <NotFound /> // or "This profile is private"
  }

  return (
    <div>
      <ProfileHeader
        name={user.name}
        image={user.image}
        bio={user.bio}
        joinDate={user.createdAt}
        recipeCount={savedRecipes.length}
      />

      {/* Dietary badges */}
      <DietaryBadges preferences={user.profile.dietaryPreferences} />

      {/* Saved recipes grid */}
      <RecipeGrid recipes={savedRecipes} />
    </div>
  )
}
```

**Features**:
- Profile photo, name, bio
- Join date
- Recipe count
- Dietary preference badges (vegan, gluten-free, etc.)
- Grid of saved recipes (linked to `/recipe/[slug]`)

**Username Claiming**:
- Available in `/settings/profile`
- Input field to set custom username
- Validation: alphanumeric + dash/underscore, 3-20 chars, unique
- Default: auto-generated from email or name

### 6. Favorites & Saving System

**User Action**: Click "⭐ Save" button on recipe card

**Frontend** (client-side):
```typescript
async function saveRecipe(recipeSlug: string) {
  // 1. Save to user's saved recipes (Vercel Postgres)
  await fetch('/api/recipes/save', {
    method: 'POST',
    body: JSON.stringify({ recipeSlug })
  })

  // 2. Increment savedCount in Payload (GraphQL mutation)
  await fetch('/api/graphql', {
    method: 'POST',
    body: JSON.stringify({
      query: `
        mutation IncrementSavedCount($slug: String!) {
          updateRecipe(where: { slug: { equals: $slug } }, data: { savedCount: { increment: 1 } }) {
            savedCount
          }
        }
      `,
      variables: { slug: recipeSlug }
    })
  })

  // 3. Update UI optimistically
  setSaved(true)
  setSavedCount(prev => prev + 1)
}
```

**Backend** (`app/api/recipes/save/route.ts`):
```typescript
export async function POST(req: Request) {
  const session = await getServerSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { recipeSlug } = await req.json()

  // Insert into user_saved_recipes table
  await db.insert(userSavedRecipes).values({
    userId: session.user.id,
    recipeSlug,
    savedAt: new Date()
  })

  return Response.json({ success: true })
}
```

**Viewing Saved Recipes**:
- `/saved` route (user's private saved recipes page)
- Query: `SELECT * FROM user_saved_recipes WHERE userId = ? ORDER BY savedAt DESC`
- Fetch recipe details from Payload by slugs
- Display as grid with unsave button

---

## Pricing & Billing System

### Tiers

| Tier | Price | Messages/Month | Daily Cap | Top-Ups |
|------|-------|----------------|-----------|---------|
| Free | $0 | 50 | 10/day | ❌ |
| Pro | $5 | 500 | None | ✅ $5 = 500 msgs |
| Power | $20 | 3000 | None | ✅ $5 = 500 msgs |

**Premium Model Multipliers**:
- GPT-4o mini (default): 1x message
- GPT-4o: 3x messages
- Claude 3.5 Sonnet: 3x messages
- Gemini Pro: 2x messages

**Message Counting**:
- Only user messages count (not AI responses)
- Image uploads: count as 1 message (vision cost absorbed)
- Premium model usage: multiply message cost (e.g., 1 GPT-4o message = 3 messages deducted)

### Usage Tracking

**Flow**:
1. User sends message → API route checks current usage
2. Query `user_usage` table for current month
3. Calculate: `messagesUsed + messageCost <= messagesLimit + topUpBalance`
4. If exceeded → show upgrade dialog
5. If within limit → process message, increment `messagesUsed`

**Implementation** (`app/api/chat/route.ts`):
```typescript
export async function POST(req: Request) {
  const session = await getServerSession()
  const { messages, model } = await req.json()

  // Get usage for current month
  const currentMonth = new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  let usage = await db.query.userUsage.findFirst({
    where: eq(userUsage.userId, session.user.id) && eq(userUsage.month, currentMonth)
  })

  if (!usage) {
    // Create new month entry
    usage = await db.insert(userUsage).values({
      userId: session.user.id,
      month: currentMonth,
      messagesUsed: 0,
      messagesLimit: 50, // default free tier
      tier: 'free',
      topUpBalance: 0
    }).returning()
  }

  // Calculate message cost
  const modelCostMultiplier = MODEL_COSTS[model] || 1 // e.g., { 'gpt-4o': 3, 'gpt-4o-mini': 1 }
  const totalMessages = usage.messagesUsed + usage.topUpBalance
  const limit = usage.messagesLimit

  if (totalMessages >= limit) {
    return Response.json({ error: 'Message limit reached', usage }, { status: 429 })
  }

  // Process chat...
  const result = await streamText({
    model: getModel(model),
    messages,
    system: SYSTEM_PROMPT,
  })

  // Increment usage
  await db.update(userUsage)
    .set({ messagesUsed: usage.messagesUsed + modelCostMultiplier })
    .where(eq(userUsage.id, usage.id))

  return result.toDataStreamResponse()
}
```

**Monthly Reset** (Cron job via Vercel Cron or separate script):
```typescript
// runs on 1st of each month
export async function resetMonthlyUsage() {
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)
  const lastMonthStr = lastMonth.toISOString().slice(0, 7)

  // Reset topUpBalance to 0 (unused top-ups deleted)
  await db.update(userUsage)
    .set({ topUpBalance: 0 })
    .where(eq(userUsage.month, lastMonthStr))

  // No need to create new month entries; they're created on first message
}
```

### UI Components

**Usage Display** (in `/settings/profile`):
```tsx
<Card>
  <CardHeader>
    <CardTitle>Usage This Month</CardTitle>
  </CardHeader>
  <CardContent>
    <Progress value={(usage.messagesUsed / usage.messagesLimit) * 100} />
    <p>{usage.messagesUsed} / {usage.messagesLimit} messages used</p>
    {usage.topUpBalance > 0 && (
      <p className="text-sm text-muted-foreground">
        + {usage.topUpBalance} bonus messages from top-ups
      </p>
    )}
  </CardContent>
</Card>
```

**Upgrade Dialog** (triggered at 80% and 100%):
```tsx
<Dialog open={usage.messagesUsed / usage.messagesLimit >= 0.8}>
  <DialogContent>
    <DialogTitle>
      {usage.messagesUsed >= usage.messagesLimit
        ? "You've reached your message limit"
        : "You're running low on messages"}
    </DialogTitle>
    <DialogDescription>
      You've used {usage.messagesUsed} of {usage.messagesLimit} messages this month.
      {usage.tier === 'free' && ' Upgrade to Pro for 10x more messages!'}
    </DialogDescription>
    <div className="flex gap-2">
      {usage.tier !== 'free' && <Button onClick={buyTopUp}>Buy 500 messages ($5)</Button>}
      <Button onClick={upgradeTier}>Upgrade to {nextTier}</Button>
    </div>
  </DialogContent>
</Dialog>
```

**Model Selector** (in chat area):
```tsx
<ModelSelector>
  <ModelSelectorTrigger>
    <Button variant="ghost" size="sm">
      <ModelSelectorLogo provider="openai" />
      {selectedModel.name}
    </Button>
  </ModelSelectorTrigger>
  <ModelSelectorContent>
    <ModelSelectorList>
      <ModelSelectorGroup heading="Standard">
        <ModelSelectorItem value="gpt-4o-mini">
          <ModelSelectorLogo provider="openai" />
          <ModelSelectorName>GPT-4o mini</ModelSelectorName>
          <ModelSelectorShortcut>1x</ModelSelectorShortcut>
        </ModelSelectorItem>
      </ModelSelectorGroup>
      <ModelSelectorSeparator />
      <ModelSelectorGroup heading="Premium">
        <ModelSelectorItem value="gpt-4o">
          <ModelSelectorLogo provider="openai" />
          <ModelSelectorName>GPT-4o</ModelSelectorName>
          <ModelSelectorShortcut>3x</ModelSelectorShortcut>
        </ModelSelectorItem>
        <ModelSelectorItem value="claude-3.5-sonnet">
          <ModelSelectorLogo provider="anthropic" />
          <ModelSelectorName>Claude 3.5 Sonnet</ModelSelectorName>
          <ModelSelectorShortcut>3x</ModelSelectorShortcut>
        </ModelSelectorItem>
        <ModelSelectorItem value="gemini-pro">
          <ModelSelectorLogo provider="google" />
          <ModelSelectorName>Gemini Pro</ModelSelectorName>
          <ModelSelectorShortcut>2x</ModelSelectorShortcut>
        </ModelSelectorItem>
      </ModelSelectorGroup>
    </ModelSelectorList>
  </ModelSelectorContent>
</ModelSelector>
```

### Stripe Integration

**Subscription Management** (already setup):
- Create checkout session for tier upgrade
- Webhook handler for `checkout.session.completed`
- Update `user_usage.tier` and `messagesLimit` in database
- Webhook handler for `customer.subscription.deleted` (downgrade)

**Top-Up Purchases**:
- One-time payment (not subscription)
- Increment `user_usage.topUpBalance` on successful payment
- Available to Pro/Power tiers only

---

## Content Moderation & Safety

### OpenAI Moderation API

**Implementation** (`lib/moderation.ts`):
```typescript
export async function moderateContent(text: string) {
  const response = await fetch('https://api.openai.com/v1/moderations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ input: text })
  })

  const { results } = await response.json()
  const flagged = results[0].flagged
  const categories = results[0].categories

  return { flagged, categories }
}
```

**Usage**:
1. **User-generated content**: Run moderation on profile bios, usernames
2. **Chat messages**: Optional (adds latency, but catches harmful requests)
3. **Recipe submissions**: If you allow user-submitted recipes later

**Auto-block**: If flagged, reject with message: "This content violates our community guidelines."

### Report System

**Report Button** (on user profiles, recipes):
```tsx
<Button variant="ghost" size="sm" onClick={openReportDialog}>
  <Flag className="h-4 w-4" /> Report
</Button>

<Dialog>
  <DialogContent>
    <DialogTitle>Report Content</DialogTitle>
    <form onSubmit={handleSubmit}>
      <Select name="reportType">
        <option value="content">Inappropriate content</option>
        <option value="user">Spam or abuse</option>
        <option value="recipe">Inaccurate or unsafe recipe</option>
        <option value="other">Other</option>
      </Select>
      <Textarea name="description" placeholder="Describe the issue..." required />
      <Button type="submit">Submit Report</Button>
    </form>
  </DialogContent>
</Dialog>
```

**Backend** (`app/api/reports/route.ts`):
```typescript
export async function POST(req: Request) {
  const session = await getServerSession()
  const { reportType, targetId, description } = await req.json()

  // Moderate the report description itself
  const moderation = await moderateContent(description)
  if (moderation.flagged) {
    return Response.json({ error: 'Report contains inappropriate content' }, { status: 400 })
  }

  // Save to database
  await db.insert(problemReports).values({
    userId: session.user.id,
    reportType,
    targetId,
    description,
    status: 'pending'
  })

  // Also send to Payload CMS for admin review
  await fetch(`${process.env.PAYLOAD_API_URL}/api/problems`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: session.user.id,
      reportType,
      targetId,
      description,
      status: 'pending',
      createdAt: new Date()
    })
  })

  return Response.json({ success: true })
}
```

**Admin Review** (Payload CMS):
- Collection: `problems`
- Fields: userId, reportType, targetId, description, status, createdAt
- Admin can review in Payload admin panel → mark as "reviewed" or "resolved"
- Take action: delete content, ban user, etc.

---

## Analytics & Monitoring

### Posthog Integration

**Setup** (`lib/analytics.ts`):
```typescript
import posthog from 'posthog-js'

export function initPosthog() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: 'https://app.posthog.com',
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.opt_out_capturing()
      }
    })
  }
}
```

**Events to Track**:
```typescript
// User lifecycle
posthog.capture('user_signed_up', { method: 'email' })
posthog.capture('onboarding_completed', { duration: 120 })

// Feature usage
posthog.capture('recipe_generated', { model: 'gpt-4o-mini', hasImage: false })
posthog.capture('image_uploaded', { result: 'success' })
posthog.capture('recipe_saved', { recipeSlug: 'chicken-stir-fry' })
posthog.capture('ingredient_clicked', { ingredientSlug: 'chicken-breast' })

// Monetization
posthog.capture('upgrade_clicked', { fromTier: 'free', toTier: 'pro' })
posthog.capture('checkout_completed', { tier: 'pro', amount: 5 })
posthog.capture('top_up_purchased', { amount: 5 })

// Engagement
posthog.capture('message_sent', { model: 'gpt-4o-mini', conversationLength: 5 })
posthog.capture('suggestion_chip_clicked', { chipText: 'Quick dinner ideas' })
posthog.capture('profile_made_public')
```

**Funnels**:
1. Signup → Onboarding → First message → Recipe generated
2. Free tier → 80% usage → Upgrade dialog → Checkout
3. Recipe view → Save → Profile public → Share

### AI Cost Tracking

**Database** (`user_usage` table extended):
```typescript
user_usage {
  // ... existing fields
  totalAICost: number // cumulative $ spent on AI API calls
  costThisMonth: number // reset monthly
}
```

**Tracking** (in chat API route):
```typescript
const MODEL_COSTS_PER_TOKEN = {
  'gpt-4o-mini': { input: 0.00000015, output: 0.0000006 },
  'gpt-4o': { input: 0.0000025, output: 0.00001 },
  'claude-3.5-sonnet': { input: 0.000003, output: 0.000015 },
}

async function trackAICost(userId: string, model: string, usage: { inputTokens: number, outputTokens: number }) {
  const costs = MODEL_COSTS_PER_TOKEN[model]
  const cost = (usage.inputTokens * costs.input) + (usage.outputTokens * costs.output)

  await db.update(userUsage)
    .set({
      totalAICost: sql`${userUsage.totalAICost} + ${cost}`,
      costThisMonth: sql`${userUsage.costThisMonth} + ${cost}`
    })
    .where(eq(userUsage.userId, userId))
}
```

**Dashboard** (admin only, `/admin/costs`):
- Total AI spend this month
- Cost per user (identify power users)
- Average cost per conversation
- Alerts if daily spend > $X

---

## Mobile-First & PWA

### Responsive Design
- All components use Tailwind responsive classes (`sm:`, `md:`, `lg:`)
- Chat input adapts to mobile keyboards
- Touch-friendly buttons (min 44x44px)
- Bottom navigation for mobile (Home, Explore, Saved, Profile)

### PWA Configuration

**Manifest** (`public/manifest.json`):
```json
{
  "name": "Cooksa",
  "short_name": "Cooksa",
  "description": "Your AI cooking companion",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ff6b35",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Service Worker** (`public/sw.js`):
- Cache static assets
- Offline fallback page
- Background sync for failed requests

**Next.js Config** (`next.config.js`):
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA({
  // ... other config
})
```

**Camera Access**:
- Use `<input type="file" accept="image/*" capture="environment" />` for direct camera capture on mobile
- Fallback to file picker on desktop

---

## Payload CMS Integration

### Setup

**Payload Config** (separate repo/project: `cooksa-cms`):
```typescript
// payload.config.ts
import { buildConfig } from 'payload/config'
import { cloudflareWorkersAdapter } from '@payloadcms/cloudflare-workers'

export default buildConfig({
  collections: [
    {
      slug: 'ingredients',
      admin: { useAsTitle: 'name' },
      fields: [
        { name: 'slug', type: 'text', required: true, unique: true },
        { name: 'name', type: 'text', required: true },
        { name: 'category', type: 'select', options: ['protein', 'vegetable', 'grain', 'dairy', 'fruit', 'spice', 'other'] },
        {
          name: 'nutritionPer100g',
          type: 'group',
          fields: [
            { name: 'calories', type: 'number', required: true },
            { name: 'protein', type: 'number', required: true },
            { name: 'carbs', type: 'number', required: true },
            { name: 'fat', type: 'number', required: true },
            { name: 'fiber', type: 'number' },
            { name: 'sugar', type: 'number' },
            { name: 'sodium', type: 'number' },
            { name: 'vitamins', type: 'json' },
            { name: 'minerals', type: 'json' },
          ]
        },
        { name: 'commonUnit', type: 'text' },
        { name: 'unitWeight', type: 'number' },
        { name: 'image', type: 'upload', relationTo: 'media' },
        { name: 'seasonality', type: 'text' },
        { name: 'storageTips', type: 'textarea' },
        { name: 'substitutes', type: 'array', fields: [{ name: 'item', type: 'text' }] },
        { name: 'healthBenefits', type: 'textarea' },
        { name: 'allergens', type: 'array', fields: [{ name: 'allergen', type: 'text' }] },
      ]
    },
    {
      slug: 'recipes',
      admin: { useAsTitle: 'title' },
      fields: [
        { name: 'slug', type: 'text', required: true, unique: true },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'textarea' },
        { name: 'image', type: 'upload', relationTo: 'media' },
        {
          name: 'ingredients',
          type: 'array',
          fields: [
            { name: 'ingredient', type: 'relationship', relationTo: 'ingredients', required: true },
            { name: 'quantity', type: 'number', required: true },
            { name: 'unit', type: 'text', required: true },
            { name: 'notes', type: 'text' },
          ]
        },
        { name: 'steps', type: 'array', fields: [{ name: 'step', type: 'textarea', required: true }] },
        { name: 'cookTime', type: 'number' },
        { name: 'prepTime', type: 'number' },
        { name: 'servings', type: 'number', required: true },
        { name: 'difficulty', type: 'select', options: ['easy', 'medium', 'hard'] },
        { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
        { name: 'cuisine', type: 'text' },
        {
          name: 'nutrition',
          type: 'group',
          fields: [
            { name: 'calories', type: 'number', required: true },
            { name: 'protein', type: 'number', required: true },
            { name: 'carbs', type: 'number', required: true },
            { name: 'fat', type: 'number', required: true },
          ]
        },
        { name: 'tips', type: 'array', fields: [{ name: 'tip', type: 'textarea' }] },
        { name: 'savedCount', type: 'number', defaultValue: 0 },
        { name: 'author', type: 'text', defaultValue: 'Cooksa Team' },
        { name: 'isPublished', type: 'checkbox', defaultValue: false },
      ]
    },
    {
      slug: 'problems',
      admin: { useAsTitle: 'reportType' },
      fields: [
        { name: 'userId', type: 'text', required: true },
        { name: 'reportType', type: 'select', options: ['content', 'user', 'recipe', 'other'], required: true },
        { name: 'targetId', type: 'text', required: true },
        { name: 'description', type: 'textarea', required: true },
        { name: 'status', type: 'select', options: ['pending', 'reviewed', 'resolved'], defaultValue: 'pending' },
      ]
    }
  ],
  db: cloudflareWorkersAdapter({
    // D1 database binding
  }),
  graphQL: {
    schemaOutputFile: path.resolve(__dirname, 'generated-schema.graphql')
  }
})
```

**Deploy to Cloudflare Workers**:
```bash
cd cooksa-cms
npm install
npm run build
wrangler publish
```

### GraphQL Codegen (Next.js)

**Install**:
```bash
npm install --save-dev @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-urql
npm install urql
```

**Config** (`codegen.yml`):
```yaml
schema: https://your-payload-api.workers.dev/api/graphql
documents: 'lib/graphql/**/*.graphql'
generates:
  lib/graphql/generated.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-urql
    config:
      withHooks: true
```

**Example Query** (`lib/graphql/queries.graphql`):
```graphql
query GetIngredients {
  Ingredients {
    docs {
      id
      slug
      name
      nutritionPer100g {
        calories
        protein
        carbs
        fat
      }
      commonUnit
      unitWeight
    }
  }
}

query GetIngredientBySlug($slug: String!) {
  Ingredients(where: { slug: { equals: $slug } }) {
    docs {
      id
      slug
      name
      category
      nutritionPer100g {
        calories
        protein
        carbs
        fat
        fiber
        sugar
        sodium
        vitamins
        minerals
      }
      image {
        url
      }
      seasonality
      storageTips
      substitutes
      healthBenefits
      allergens
    }
  }
}

query GetRecipes($limit: Int, $where: RecipeWhere) {
  Recipes(limit: $limit, where: $where) {
    docs {
      slug
      title
      description
      image { url }
      cookTime
      servings
      difficulty
      tags
      savedCount
      nutrition {
        calories
        protein
        carbs
        fat
      }
    }
  }
}

mutation IncrementRecipeSavedCount($slug: String!) {
  updateRecipe(where: { slug: { equals: $slug } }, data: { savedCount: { increment: 1 } }) {
    savedCount
  }
}
```

**Usage in Next.js**:
```typescript
import { createClient } from 'urql'
import { useGetIngredientsQuery } from '@/lib/graphql/generated'

const client = createClient({
  url: process.env.PAYLOAD_GRAPHQL_URL!,
})

export function IngredientsList() {
  const [result] = useGetIngredientsQuery()

  if (result.fetching) return <Spinner />
  if (result.error) return <Error message={result.error.message} />

  return (
    <ul>
      {result.data?.Ingredients?.docs?.map(ingredient => (
        <li key={ingredient.id}>{ingredient.name}</li>
      ))}
    </ul>
  )
}
```

### USDA Data Import Script

**Script** (`scripts/import-usda-ingredients.ts`):
```typescript
const USDA_API_KEY = process.env.USDA_API_KEY
const USDA_API_URL = 'https://api.nal.usda.gov/fdc/v1'

async function searchIngredient(query: string) {
  const response = await fetch(`${USDA_API_URL}/foods/search?query=${query}&api_key=${USDA_API_KEY}`)
  const data = await response.json()
  return data.foods[0] // get top result
}

async function getFoodDetails(fdcId: number) {
  const response = await fetch(`${USDA_API_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`)
  return await response.json()
}

async function importIngredient(name: string, category: string) {
  const food = await searchIngredient(name)
  if (!food) {
    console.log(`No USDA data found for: ${name}`)
    return
  }

  const details = await getFoodDetails(food.fdcId)

  // Extract nutrients
  const nutrients = {}
  for (const nutrient of details.foodNutrients) {
    const key = nutrient.nutrient.name.toLowerCase()
    nutrients[key] = nutrient.amount
  }

  // Create in Payload
  await fetch(`${process.env.PAYLOAD_API_URL}/api/ingredients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      name: name,
      category: category,
      nutritionPer100g: {
        calories: nutrients['energy'] || 0,
        protein: nutrients['protein'] || 0,
        carbs: nutrients['carbohydrate, by difference'] || 0,
        fat: nutrients['total lipid (fat)'] || 0,
        fiber: nutrients['fiber, total dietary'] || 0,
        sugar: nutrients['sugars, total including nlea'] || 0,
        sodium: nutrients['sodium'] || 0,
      },
      commonUnit: 'piece', // default, adjust manually later
      unitWeight: 100, // default
    })
  })

  console.log(`Imported: ${name}`)
}

// List of 500-1000 common ingredients
const INGREDIENTS = [
  { name: 'Chicken breast', category: 'protein' },
  { name: 'Ground beef', category: 'protein' },
  { name: 'Salmon fillet', category: 'protein' },
  { name: 'Eggs', category: 'protein' },
  { name: 'Tofu', category: 'protein' },
  { name: 'White rice', category: 'grain' },
  { name: 'Brown rice', category: 'grain' },
  { name: 'Pasta', category: 'grain' },
  { name: 'Bread', category: 'grain' },
  { name: 'Oats', category: 'grain' },
  { name: 'Tomato', category: 'vegetable' },
  { name: 'Onion', category: 'vegetable' },
  { name: 'Garlic', category: 'vegetable' },
  { name: 'Bell pepper', category: 'vegetable' },
  { name: 'Spinach', category: 'vegetable' },
  { name: 'Broccoli', category: 'vegetable' },
  { name: 'Carrot', category: 'vegetable' },
  { name: 'Potato', category: 'vegetable' },
  { name: 'Sweet potato', category: 'vegetable' },
  { name: 'Cucumber', category: 'vegetable' },
  // ... 480 more ingredients
]

async function main() {
  for (const ingredient of INGREDIENTS) {
    await importIngredient(ingredient.name, ingredient.category)
    await new Promise(resolve => setTimeout(resolve, 500)) // rate limiting
  }
}

main()
```

**Run**:
```bash
ts-node scripts/import-usda-ingredients.ts
```

---

## Implementation Timeline

**Total Time**: ~200 hours over 5 weeks

### Week 1: Foundation (40 hours)
- [x] Payload CMS setup on Cloudflare Workers (8h)
- [x] USDA ingredient import script + data seeding (12h)
- [x] GraphQL codegen setup in Next.js (4h)
- [x] Database schema (Drizzle migrations) (6h)
- [x] NextAuth configuration verification (2h)
- [x] Basic UI theme/branding (Tailwind config, colors) (4h)
- [x] Model selector integration (existing component) (2h)
- [x] Posthog analytics setup (2h)

### Week 2: Core Chat & AI (40 hours)
- [x] Chat API route with streaming (`/api/chat`) (8h)
- [x] System prompt design (Cooksa personality) (2h)
- [x] Recipe generation with Zod schema + `generateObject` (8h)
- [x] Nutrition calculation from Payload ingredients (6h)
- [x] Recipe card component (rich interactive design) (8h)
- [x] AI tools: `saveUserProfile`, `fetchIngredients` (4h)
- [x] Message usage tracking + limits (4h)

### Week 3: Onboarding, Image, User Features (40 hours)
- [x] Hybrid onboarding flow (quick form + conversational) (8h)
- [x] Image upload + vision model integration (8h)
- [x] User profile settings page (6h)
- [x] Recipe saving system (frontend + backend) (6h)
- [x] Saved recipes page (`/saved`) (4h)
- [x] Dynamic suggestion chips based on user profile (6h)
- [x] Username claiming + profile public toggle (2h)

### Week 4: Discovery, Static Pages, Social (40 hours)
- [x] `/explore` page (recipe grid, filters, sort) (8h)
- [x] `/recipe/[slug]` static pages (SSG, Open Graph) (6h)
- [x] `/ingredient/[slug]` static pages (comprehensive) (6h)
- [x] `/user/[username]/recipes` profile pages (6h)
- [x] Share functionality (copy link, social buttons) (4h)
- [x] Report system (form + Payload integration) (4h)
- [x] OpenAI moderation integration (4h)
- [x] Mobile responsive polish (2h)

### Week 5: Billing, PWA, Polish, Launch (40 hours)
- [x] Stripe checkout flow (verify existing integration) (4h)
- [x] Top-up purchase flow (6h)
- [x] Usage dialogs (80%, 100% warnings) (4h)
- [x] PWA setup (manifest, service worker) (6h)
- [x] AI cost tracking dashboard (admin only) (4h)
- [x] Error handling + edge cases (4h)
- [x] Mobile testing (camera, touch UI) (4h)
- [x] End-to-end testing (user flows) (4h)
- [x] Deploy to Vercel + final checks (2h)
- [x] Launch! (2h)

---

## Environment Variables

**Next.js** (`.env.local`):
```bash
# Database
DATABASE_URL=postgres://...

# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...

# AI
OPENAI_API_KEY=sk-...

# Payload CMS
PAYLOAD_GRAPHQL_URL=https://your-cms.workers.dev/api/graphql

# USDA API (for data import script)
USDA_API_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

**Payload CMS** (Cloudflare Workers env vars):
```bash
DATABASE_URL= # Cloudflare D1 binding
PAYLOAD_SECRET=...
```

---

## Success Metrics (Post-Launch)

**Week 1 Goals**:
- 100 signups
- 500+ recipes generated
- <2% error rate
- Average session: 5+ messages
- 10% conversion to paid (ambitious but possible)

**Monitor**:
- Posthog retention cohorts (Day 1, Day 7, Day 30)
- AI cost per user (optimize if >$0.02/user)
- Recipe save rate (% of recipes that get saved)
- Ingredient link click-through rate
- Profile public opt-in rate

---

## Post-MVP Roadmap (Phase 2)

**Features to Add After Launch**:
1. **RAG System** (vector DB for curated recipe search)
2. **Meal Planning** (7-day calendar UI)
3. **Shopping List Generation** (from meal plans/recipes)
4. **Collections** (user-organized recipe folders)
5. **Social Features** (follow users, activity feed)
6. **Voice Input** (hands-free cooking mode)
7. **Timer Integration** (for cooking steps)
8. **Recipe Scaling** (adjust servings dynamically)
9. **Nutritionist Chat Mode** (stricter macro tracking)
10. **API Access** (for 3rd-party integrations)

---

## Open Questions & Decisions

✅ **Resolved**:
- Data storage: Hybrid (Vercel Postgres + Payload CMS)
- Recipe source: AI-generated with Payload ingredient constraints
- Nutrition accuracy: Calculated from ingredient macros
- Onboarding: Hybrid (quick form + conversational)
- Image upload: Single photo, confidence-based suggestions
- Pricing: 3-tier with top-ups
- Mobile: Mobile-first + PWA
- Moderation: OpenAI API + report system
- Analytics: Posthog + custom AI cost tracking

**Still Open** (decide during development):
- Exact system prompt wording (iterate based on testing)
- Suggestion chip phrases (user testing)
- Free tier daily cap enforcement UX (hard block vs. soft reminder)
- Recipe matching algorithm (AI-generated vs. Payload exact match)
- Profile bio character limits
- Image upload size optimization (compress before sending?)

---

## Risk Mitigation

**Technical Risks**:
- **Payload on CF Workers stability**: Have fallback to Payload on Vercel or Supabase if issues
- **AI hallucinations**: Strict ingredient constraints + human review of curated recipes
- **USDA import errors**: Manual verification of top 100 ingredients
- **Vision model accuracy**: Set expectations (80-85%), allow user corrections

**Business Risks**:
- **Low conversion to paid**: Offer 7-day Pro trial or referral credits
- **High AI costs**: Monitor per-user costs, optimize prompts, cache common recipes
- **User acquisition**: Leverage SEO (static recipe pages), social sharing, Product Hunt launch

**Timeline Risks**:
- **Scope creep**: Ruthlessly cut features that aren't in this plan
- **Unforeseen bugs**: Allocate 10% buffer time in Week 5
- **External API issues**: Have monitoring/alerts for USDA, Payload, OpenAI uptime

---

## Launch Checklist

- [ ] All core features tested on mobile + desktop
- [ ] Payment flow tested (test mode)
- [ ] Error tracking configured (Sentry or similar)
- [ ] Analytics events verified (Posthog)
- [ ] SEO meta tags on all public pages
- [ ] Open Graph images for sharing
- [ ] PWA installable on iOS + Android
- [ ] Legal pages: Terms of Service, Privacy Policy
- [ ] Email notifications setup (Resend or similar)
- [ ] Domain configured (cooksa.com?)
- [ ] SSL certificate
- [ ] Monitoring/alerts (Vercel, Posthog, custom)
- [ ] Backup strategy for database
- [ ] Product Hunt page draft
- [ ] Social media accounts (Twitter, Instagram)
- [ ] Demo video recorded
- [ ] Landing page with screenshots
- [ ] Press kit (if targeting media)

---

## Contact & Support

**For Implementation Questions**:
- Refer to Vercel AI SDK docs: https://sdk.vercel.ai/docs
- Next.js App Router: https://nextjs.org/docs/app
- Payload CMS: https://payloadcms.com/docs
- Drizzle ORM: https://orm.drizzle.team/docs

**Community**:
- Vercel Discord
- Payload Discord
- Next.js subreddit

---

**Let's build Cooksa! 🍳**
