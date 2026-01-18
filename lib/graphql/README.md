# GraphQL Operations

This directory contains GraphQL operations (queries, mutations, and fragments) for the application.

## Directory Structure

```
lib/graphql/
├── queries/       # GraphQL queries
├── mutations/     # GraphQL mutations
├── fragments/     # Reusable GraphQL fragments
└── README.md      # This file
```

## Usage

### Writing GraphQL Operations

You can write GraphQL operations in two ways:

#### 1. In `.graphql` files (Recommended)

```graphql
# lib/graphql/queries/getUser.graphql
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
  }
}
```

#### 2. In TypeScript files using `graphql` tag

```typescript
import { graphql } from '@/lib/gql';

const GET_USER = graphql(`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`);
```

### Generating Types

After writing your GraphQL operations, run:

```bash
# Generate types once
pnpm codegen

# Watch mode (regenerates on file changes)
pnpm codegen:watch
```

This will generate TypeScript types in `lib/gql/` based on your schema and operations.

### Using Generated Types

```typescript
import { useQuery } from '@apollo/client'; // or your GraphQL client
import { GetUserDocument } from '@/lib/gql/graphql';

function UserProfile({ userId }: { userId: string }) {
  const { data, loading, error } = useQuery(GetUserDocument, {
    variables: { id: userId }
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data.user.name}</h1>
      <p>{data.user.email}</p>
    </div>
  );
}
```

## Schema Sources

The code generator fetches schemas from:
- **Local**: `http://localhost:3000/api/graphql`
- **Production**: `https://cooksa-api.g-saliev.workers.dev/api/graphql`

## Configuration

See `codegen.ts` in the project root for configuration details.
