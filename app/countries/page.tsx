import Image from "next/image";
import Link from "next/link";
import type { GetCountriesQuery } from "@/lib/gql/graphql";
import { executeGraphQL } from "@/lib/graphql/client";

const GET_COUNTRIES_QUERY = `
  query {
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

export default async function CountriesPage() {
  const result = await executeGraphQL<GetCountriesQuery, Record<string, never>>(
    GET_COUNTRIES_QUERY
  );

  if (result.errors) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">Error Loading Countries</h1>
          <p className="text-muted-foreground">
            {result.errors[0]?.message || "Failed to load countries"}
          </p>
        </div>
      </div>
    );
  }

  const countries = result.data?.Countries?.docs || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Countries</h1>
          <p className="text-muted-foreground">
            Explore {countries.length} countries from around the world
          </p>
        </div>

        {/* Countries Grid */}
        {countries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">No countries found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {countries.map((country) => (
              <Link
                className="group block bg-card rounded-lg overflow-hidden border border-border hover:border-primary transition-all hover:shadow-lg"
                href={`/countries/${country.id}`}
                key={country.id}
              >
                {/* Country Image */}
                {country.image && (
                  <div className="relative w-full h-48 overflow-hidden">
                    <Image
                      alt={country.image.alt || country.name || ""}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      height={100}
                      src={country.image.url}
                      width={100}
                    />
                  </div>
                )}

                {/* Country Info */}
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {country.name}
                  </h2>

                  <div className="space-y-1 text-sm text-muted-foreground">
                    {country.capital && (
                      <p>
                        <span className="font-medium">Capital:</span>{" "}
                        {country.capital}
                      </p>
                    )}

                    {country.population && (
                      <p>
                        <span className="font-medium">Population:</span>{" "}
                        {country.population.toLocaleString()}
                      </p>
                    )}
                  </div>

                  {/* View Details Link */}
                  <div className="mt-4 flex items-center text-sm text-primary">
                    View details
                    <svg
                      className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        d="M9 5l7 7-7 7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Metadata for SEO
export const metadata = {
  title: "Countries - Explore the World",
  description:
    "Browse and explore countries from around the world with detailed information about their capitals and populations.",
};
