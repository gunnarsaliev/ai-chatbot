import Image from "next/image";
import { notFound } from "next/navigation";
import type {
  GetCountryQuery,
  GetCountryQueryVariables,
} from "@/lib/gql/graphql";
import { executeGraphQL } from "@/lib/graphql/client";

const GET_COUNTRY_QUERY = `
  query ($id: ID!) {
    Country(id: $id) {
      id
      name
      capital
      population
      image {
        alt
        url
      }
    }
  }
`;

interface CountryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function CountryPage({ params }: CountryPageProps) {
  const { id } = await params;

  const result = await executeGraphQL<
    GetCountryQuery,
    GetCountryQueryVariables
  >(GET_COUNTRY_QUERY, { id });

  if (result.errors || !result.data?.Country) {
    notFound();
  }

  const country = result.data.Country;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Country Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{country.name}</h1>
          {country.image && (
            <div className="relative w-full h-96 rounded-lg overflow-hidden mb-6">
              <Image
                alt={country.image.alt || country.name || ""}
                className="w-full h-full object-cover"
                height={500}
                src={country.image.url}
                width={500}
              />
            </div>
          )}
        </div>

        {/* Country Details */}
        <div className="bg-card rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold mb-4">Country Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Country ID</p>
              <p className="text-lg font-medium">{country.id}</p>
            </div>

            {country.capital && (
              <div>
                <p className="text-sm text-muted-foreground">Capital</p>
                <p className="text-lg font-medium">{country.capital}</p>
              </div>
            )}

            {country.population && (
              <div>
                <p className="text-sm text-muted-foreground">Population</p>
                <p className="text-lg font-medium">
                  {country.population.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8">
          <a
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            href="/countries"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                d="M15 19l-7-7 7-7"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
              />
            </svg>
            Back to all countries
          </a>
        </div>
      </div>
    </div>
  );
}

// Generate static params for all countries (optional - for static generation)
export async function generateStaticParams() {
  // You can fetch all countries and generate static pages
  // or return an empty array for dynamic rendering only
  return [];
}

// Metadata for SEO
export async function generateMetadata({ params }: CountryPageProps) {
  const { id } = await params;

  const result = await executeGraphQL<
    GetCountryQuery,
    GetCountryQueryVariables
  >(GET_COUNTRY_QUERY, { id });

  if (result.errors || !result.data?.Country) {
    return {
      title: "Country Not Found",
    };
  }

  const country = result.data.Country;

  return {
    title: `${country.name} - Countries`,
    description: `Learn about ${country.name}${country.capital ? `, with capital ${country.capital}` : ""}${country.population ? ` and population of ${country.population.toLocaleString()}` : ""}.`,
  };
}
