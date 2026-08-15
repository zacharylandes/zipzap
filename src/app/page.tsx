import { SearchApp } from "@/components/search-app";
import { parseMarketQuery, searchParamsFromRecord } from "@/markets/query";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = parseMarketQuery(searchParamsFromRecord(await searchParams));

  return (
    <main>
      <SearchApp
        query={query}
        facebookEnabled={process.env.HOUSE_SEARCH_ENABLE_FACEBOOK === "1"}
      />
    </main>
  );
}
