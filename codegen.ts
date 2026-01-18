import type { CodegenConfig } from '@graphql-codegen/cli';

/**
 * GraphQL Code Generator Configuration
 *
 * This configuration fetches GraphQL schemas from two sources:
 * - Local development: http://localhost:3000/api/graphql
 * - Production: https://cooksa-api.g-saliev.workers.dev/api/graphql
 *
 * Generated files will be placed in `lib/gql/` directory.
 * The client preset provides type-safe GraphQL operations with automatic typing.
 */
const config: CodegenConfig = {
  // Define where to fetch the GraphQL schema
  // Using local schema file since introspection is disabled on the API
  schema: 'lib/graphql/schema.graphql',

  // Look for GraphQL operations in these files
  // Supports both .graphql files and inline GraphQL in .ts/.tsx files
  documents: [
    'lib/graphql/**/*.graphql',
    'lib/graphql/**/*.ts',
    'app/**/*.graphql',
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
  ],

  // Configuration for generated output
  generates: {
    // Generate types and React hooks in lib/gql/
    'lib/gql/': {
      // Use the modern client preset
      // This provides typed document nodes and React hooks
      preset: 'client',

      // Additional configuration options
      config: {
        // Use TypeScript
        scalars: {
          DateTime: 'string',
          JSON: 'Record<string, any>',
        },
        // Skip typename field in operations
        skipTypename: false,
        // Generate React hooks for queries/mutations
        withHooks: true,
      },

      // Preset configuration
      presetConfig: {
        // Fragment masking for better type safety
        fragmentMasking: false,
      },
    },
  },

  // Watch mode settings
  watch: false,

  // Generate types on schema changes
  ignoreNoDocuments: true,
};

export default config;
