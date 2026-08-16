import { convertAmount, fetchFxRate } from "@/markets/fx";
import type { NumbeoRentEntry } from "@/markets/numbeo";
import type { Listing } from "@/search/schema";
import type { NumbeoRents } from "@/markets/enrich";

async function convertRent(
  amount: number | null | undefined,
  fromCurrency: string,
  toCurrency: string,
  rate: number | null,
): Promise<number | null> {
  if (amount == null || !(amount > 0)) return null;
  if (fromCurrency === toCurrency) return amount;
  if (rate == null) return null;
  return convertAmount(amount, rate);
}

export async function numbeoRentInLocalCurrency(
  entry: NumbeoRentEntry | undefined,
  localCurrency: string,
): Promise<number | null> {
  if (!entry?.monthlyRent || !(entry.monthlyRent > 0)) return null;
  if (entry.currency === localCurrency) return entry.monthlyRent;

  const rate = await fetchFxRate(entry.currency, localCurrency);
  if (rate == null) return null;
  return convertAmount(entry.monthlyRent, rate);
}

export async function numbeoRentsInLocalCurrency(
  entry: NumbeoRentEntry | undefined,
  localCurrency: string,
): Promise<NumbeoRents | null> {
  if (!entry?.monthlyRent || !(entry.monthlyRent > 0)) return null;
  const rate =
    entry.currency === localCurrency
      ? 1
      : await fetchFxRate(entry.currency, localCurrency);
  if (entry.currency !== localCurrency && rate == null) return null;

  const oneBedroom = await convertRent(
    entry.monthlyRent,
    entry.currency,
    localCurrency,
    rate,
  );
  if (oneBedroom == null) return null;
  return {
    oneBedroom,
    threeBedroom: await convertRent(
      entry.monthlyRent3br,
      entry.currency,
      localCurrency,
      rate,
    ),
  };
}

export async function applyLocalCurrency(
  listings: Listing[],
  localCurrency: string,
): Promise<Listing[]> {
  const foreignCurrencies = [
    ...new Set(
      listings
        .map((listing) => listing.currency)
        .filter((currency) => currency && currency !== localCurrency),
    ),
  ];

  if (foreignCurrencies.length === 0) return listings;

  const rates = new Map<string, number>();
  await Promise.all(
    foreignCurrencies.map(async (currency) => {
      const rate = await fetchFxRate(currency, localCurrency);
      if (rate != null) rates.set(currency, rate);
    }),
  );

  return listings.map((listing) => {
    if (listing.price == null || listing.currency === localCurrency) {
      return listing;
    }

    const rate = rates.get(listing.currency);
    if (rate == null) return listing;

    return {
      ...listing,
      originalPrice: listing.price,
      originalCurrency: listing.currency,
      price: convertAmount(listing.price, rate),
      currency: localCurrency,
    };
  });
}
