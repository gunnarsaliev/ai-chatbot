/**
 * GraphQL Client Configuration
 *
 * This file provides utilities for making GraphQL requests to the API.
 */

const GRAPHQL_ENDPOINTS = {
  local: 'http://localhost:3000/api/graphql',
  production: 'https://cooksa-api.g-saliev.workers.dev/api/graphql',
} as const;

/**
 * Get the GraphQL endpoint URL based on the environment
 */
export function getGraphQLEndpoint(): string {
  // Use production endpoint (external GraphQL server)
  // Set NEXT_PUBLIC_GRAPHQL_ENDPOINT=local to use the local Next.js API route instead
  if (process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT === 'local') {
    return GRAPHQL_ENDPOINTS.local;
  }
  return GRAPHQL_ENDPOINTS.production;
}

/**
 * Execute a GraphQL query
 */
export async function executeGraphQL<TResult, TVariables>(
  query: string,
  variables?: TVariables,
  endpoint?: string
): Promise<{ data?: TResult; errors?: any[] }> {
  const url = endpoint || getGraphQLEndpoint();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add any authentication headers here if needed
      // 'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    next: {
      revalidate: 3600, // Cache for 1 hour
    },
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.statusText}`);
  }

  return response.json();
}
