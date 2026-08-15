import { notFound } from "next/navigation";
import { ZipListings } from "@/components/zip-listings";
import { findMarketByZip, loadMarketsFile } from "@/markets/load";
import { homeHref, parseMarketQuery, searchParamsFromRecord } from "@/markets/query";

export default async function ZipListingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ zip: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { zip } = await params;
  if (!/^\d{5}$/.test(zip)) notFound();

  const query = parseMarketQuery(searchParamsFromRecord(await searchParams));
  const market = findMarketByZip(loadMarketsFile().markets, zip) ?? null;

  return (
    <main>
      <ZipListings zip={zip} query={query} market={market} backHref={homeHref(query)} />
    </main>
  );
}
