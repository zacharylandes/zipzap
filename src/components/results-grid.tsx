import { ListingCard } from "@/components/listing-card";
import type { Listing } from "@/search/schema";

type ResultsGridProps = {
  listings: Listing[];
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
};

export function ResultsGrid({
  listings,
  loading,
  loadingMessage = "Fetching listings from live sources…",
  emptyMessage = "No listings matched this search.",
}: ResultsGridProps) {
  if (loading) {
    return (
      <div className="hs-results hs-results--loading" aria-live="polite">
        {loadingMessage}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="hs-results hs-results--empty" aria-live="polite">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="hs-results-grid" role="list">
      {listings.map((listing) => (
        <div key={listing.id} role="listitem">
          <ListingCard listing={listing} />
        </div>
      ))}
    </div>
  );
}
