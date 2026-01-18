/**
 * React Hook for fetching countries data
 */

import { useState, useEffect } from 'react';
import type { GetCountriesQuery } from '@/lib/gql/graphql';
import { executeGraphQL } from '../client';

// Import the query string from your .graphql file
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

interface UseCountriesResult {
  countries: GetCountriesQuery['Countries'];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch countries data from the GraphQL API
 */
export function useCountries(): UseCountriesResult {
  const [countries, setCountries] = useState<GetCountriesQuery['Countries']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCountries = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await executeGraphQL<GetCountriesQuery, {}>(
        GET_COUNTRIES_QUERY
      );

      if (result.errors) {
        throw new Error(result.errors[0]?.message || 'GraphQL request failed');
      }

      setCountries(result.data?.Countries || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  return {
    countries,
    loading,
    error,
    refetch: fetchCountries,
  };
}
