# Prompt for Claude Code CLI: Build Cooksa Food Recommendation Chatbot

## Project Overview
You are tasked with building **Cooksa**, a personalized food recommendation chatbot. It acts as a friendly cooking companion, providing recipe suggestions, meal plans, ingredient substitutions, and dietary adaptations (e.g., vegan, gluten-free). The app uses AI for conversational interactions, image analysis for ingredient-based ideas, and an interactive onboarding flow for user preferences.

Base the project on the Vercel Next.js AI Chatbot template:  
- Clone from: https://github.com/vercel/ai-chatbot  
- Use Next.js App Router, Vercel AI SDK for streaming responses, Neon Postgres for chat persistence, shadcn/ui + Tailwind for UI.

Key enhancements:  
- Integrate Payload CMS on Cloudflare Workers for data storage (users, ingredients, recipes) via GraphQL with codegen.  
- Add a RAG system using a vector database (e.g., Pinecone) for semantic search of ingredients/recipes.  
- Support vision models for image uploads (e.g., fridge photos).  
- Include custom AI tools for interactions like rendering recipe cards.  
- Recipes must include calories and macro data (proteins/carbs/fats).  

Target a budget-friendly setup: Use OpenAI GPT-4o mini for AI (vision-enabled). Hosting on Vercel Hobby plan (free for light use).

## Tech Stack Requirements
- **Frontend/Backend**: Next.js (App Router).  
- **UI**: shadcn/ui components with Tailwind; theme in warm tones (oranges, reds, greens). Add branding: "Cooksa" title, chef hat emoji (🍳) in header, suggestion chips (e.g., "Quick dinner", "Vegan ideas").  
- **AI Integration**: Vercel AI SDK with OpenAI provider (use env var for API key). System prompt for Cooksa's personality: warm, enthusiastic, humorous like a home cook.  
- **Database/API**:  
  - Payload CMS on Cloudflare Workers: Collections for `userProfiles` (age, fitnessHabits, height, weight, preferences), `ingredients` (with IDs, embeddings), `recipes` (title, ingredients, steps, calories, macros). Expose via GraphQL.  
  - Use `@graphql-codegen/cli` for typesafe queries/mutations. Client: Apollo Client or urql.  
- **RAG System**:  
  - Vector DB: Pinecone (or Weaviate/pgvector). Embed using OpenAI text-embedding-ada-002.  
  - Sync: Payload hooks to generate embeddings and upsert to vector DB with matching IDs.  
  - In chat API: Embed user query, retrieve similar vectors (tied to Payload IDs), fetch full data via GraphQL, inject into AI prompt for augmented responses.  
- **Authentication**: Add Clerk or NextAuth for user sessions.  
- **Vision**: Enable multimodal with GPT-4o mini for image uploads.  
- **Costs**: Optimize for low cost; AI queries ~0.1-0.5 cents per conversation.

## Core Features to Implement
1. **Chat Interface**:  
   - Streaming responses.  
   - Conversational mode: Maintain context, ask clarifying questions (e.g., budget, time).  

2. **User Onboarding & Preferences**:  
   - Interactive AI-driven flow: Ask one question at a time (age → height → weight → fitness habits → preferences).  
   - Store in Payload via GraphQL mutation. Use AI tool calling to save data.  
   - Personalize recipes based on data (e.g., adjust calories for fitness level).  

3. **Image Support**:  
   - Allow uploads; analyze with vision model (e.g., "Suggest recipes from this fridge photo").  

4. **Recipe Output**:  
   - Structured: Use `generateObject` with Zod schema for title, ingredients (with quantities/units), steps, time, servings, tips, calories, macros.  
   - Source macros from Payload or integrate Nutritionix API.  

5. **RAG-Enhanced Search**:  
   - For queries like "low-carb recipes with tomatoes": Embed query, query vector DB, get Payload IDs, fetch details, generate response.  
   - Improves accuracy and reduces AI hallucinations.  

6. **Custom Tools & Interactions**:  
   - Use AI SDK tools:  
     - `saveProfile`: Mutate user data in Payload.  
     - `retrieveIngredients`: Query vector DB for RAG.  
     - `renderRecipeCard`: Trigger a React component in chat UI for visual recipe display (e.g., card with collapsible sections, macro badges).  
   - Other: Generate shopping lists, meal plans.  

7. **Additional Features**:  
   - Save favorites to Payload.  
   - Weekly meal planner based on preferences.  
   - Profile view button in UI to display/edit saved info.  

## Implementation Steps
1. **Setup Base Template**:  
   - Clone repo, install deps, deploy to Vercel.  
   - Update metadata/title to "Cooksa".  
   - Customize Tailwind colors.  

2. **AI Prompt & Model**:  
   - In `app/api/chat/route.ts`: Set system prompt (include onboarding rules, RAG usage).  
   - Use GPT-4o mini; add tools for GraphQL and vector DB.  

3. **Payload CMS Integration**:  
   - Define collections in `payload.config.ts`.  
   - Deploy to Cloudflare.  
   - Add GraphQL client and codegen in Next.js.  

4. **RAG Setup**:  
   - Init Pinecone index.  
   - Add Payload hooks for embedding sync.  
   - In chat route: Before `streamText`, perform RAG query and inject context.  

5. **Onboarding Flow**:  
   - In API: Query profile; if incomplete, inject system message to start questions.  
   - Parse answers with `generateObject`, call save tool.  

6. **UI Enhancements**:  
   - Add suggestion chips in empty chat state.  
   - Recipe card component: Render via tool call (e.g., return JSON for UI to parse).  

7. **Testing**:  
   - Test flows: Onboarding, image upload, recipe search with RAG, personalization.  
   - Ensure recipes include calories/macros.  

## Output Requirements
- Generate the full codebase in a structured ZIP or folder format.  
- Include `.env.example` with vars (e.g., OPENAI_API_KEY, GRAPHQL_ENDPOINT, PINECONE_API_KEY).  
- Provide setup instructions in README.md.  
- Ensure code is clean, typed (TypeScript), and modular.  

Build this step-by-step, reasoning through each file change. If needed, query external docs via tools, but focus on core logic.