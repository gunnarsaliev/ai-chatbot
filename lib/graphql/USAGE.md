# GraphQL Usage Guide

This guide shows how to use the generated GraphQL types in your application.

## Generated Files

After running `pnpm codegen`, the following files are generated in `lib/gql/`:

- `graphql.ts` - All TypeScript types based on your schema
- `gql.ts` - Helper for tagged template literals
- `index.ts` - Main export file

## Query: Get Countries

### Option 1: Using the Custom Hook (Recommended)

```typescript
import { useCountries } from '@/lib/graphql/hooks/useCountries';

export function CountriesList() {
  const { countries, loading, error, refetch } = useCountries();

  if (loading) return <div>Loading countries...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!countries?.docs) return <div>No countries found</div>;

  return (
    <div>
      <h1>Countries</h1>
      <button onClick={refetch}>Refresh</button>
      <ul>
        {countries.docs.map((country) => (
          <li key={country.id}>
            <h2>{country.name}</h2>
            {country.capital && <p>Capital: {country.capital}</p>}
            {country.population && <p>Population: {country.population.toLocaleString()}</p>}
            {country.image && (
              <img src={country.image.url} alt={country.image.alt || country.name} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Option 2: Direct API Call in Server Component

```typescript
import { executeGraphQL } from '@/lib/graphql/client';
import type { GetCountriesQuery } from '@/lib/gql/graphql';

const GET_COUNTRIES_QUERY = `
  query GetCountries {
    Countries {
      docs {
        name
        id
        capital
        population
        image {
          alt
          url
        }
      }
    }
  }
`;

export async function CountriesPage() {
  const result = await executeGraphQL<GetCountriesQuery, {}>(
    GET_COUNTRIES_QUERY
  );

  if (result.errors) {
    return <div>Error loading countries</div>;
  }

  const countries = result.data?.Countries?.docs || [];

  return (
    <div>
      <h1>Countries</h1>
      <ul>
        {countries.map((country) => (
          <li key={country.id}>
            <h2>{country.name}</h2>
            {country.capital && <p>Capital: {country.capital}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Option 3: Using in API Routes

```typescript
// app/api/countries/route.ts
import { NextResponse } from 'next/server';
import { executeGraphQL } from '@/lib/graphql/client';
import type { GetCountriesQuery } from '@/lib/gql/graphql';

const GET_COUNTRIES_QUERY = `
  query GetCountries {
    Countries {
      docs {
        name
        id
        capital
        population
        image {
          alt
          url
        }
      }
    }
  }
`;

export async function GET() {
  try {
    const result = await executeGraphQL<GetCountriesQuery, {}>(
      GET_COUNTRIES_QUERY
    );

    if (result.errors) {
      return NextResponse.json(
        { error: result.errors[0]?.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch countries' },
      { status: 500 }
    );
  }
}
```

## Type Safety Benefits

The generated types provide full type safety:

```typescript
import type { Country, Image } from '@/lib/gql/graphql';

function formatCountryName(country: Country): string {
  // TypeScript knows all the fields on Country
  return country.name.toUpperCase(); // ✅ Type-safe
}

function getImageUrl(image?: Image | null): string {
  // TypeScript knows image is optional and can be null
  return image?.url || '/default-image.jpg'; // ✅ Type-safe
}
```

## Environment Configuration

To use the local endpoint instead of production:

```bash
# .env.local
NEXT_PUBLIC_GRAPHQL_ENDPOINT=local
```

Or use production (default):

```bash
# .env.local
# NEXT_PUBLIC_GRAPHQL_ENDPOINT=production (or omit entirely)
```

## Adding More Queries

1. Create a new `.graphql` file in `lib/graphql/queries/`:

```graphql
# lib/graphql/queries/getSingleCountry.graphql
query GetCountry($id: ID!) {
  Country(id: $id) {
    name
    capital
    population
  }
}
```

2. Run codegen:
```bash
pnpm codegen
```

3. Use the generated types:
```typescript
import type { GetCountryQuery, GetCountryQueryVariables } from '@/lib/gql/graphql';

const result = await executeGraphQL<GetCountryQuery, GetCountryQueryVariables>(
  GET_COUNTRY_QUERY,
  { id: '123' }
);
```

## Watch Mode for Development

Run codegen in watch mode to automatically regenerate types when you modify queries:

```bash
pnpm codegen:watch
```
