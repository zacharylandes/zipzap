import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ListingsPanel } from "@/components/listings-panel";
import type { Listing } from "@/search/schema";

const listings: Listing[] = [
  {
    id: "low",
    sourceId: "test",
    sourceName: "Test",
    title: "Cheaper flat",
    price: 100_000,
    currency: "USD",
    bedrooms: 2,
    bathrooms: 1,
    area: 80,
    areaUnit: "sqm",
    location: "Centro",
    thumbnailUrl: null,
    url: "https://example.com/low",
    grossYield: 0.08,
    estimatedMonthlyRent: 667,
  },
  {
    id: "high",
    sourceId: "test",
    sourceName: "Test",
    title: "Higher yield flat",
    price: 120_000,
    currency: "USD",
    bedrooms: 3,
    bathrooms: 2,
    area: 110,
    areaUnit: "sqm",
    location: "Palermo",
    thumbnailUrl: null,
    url: "https://example.com/high",
    grossYield: 0.12,
    estimatedMonthlyRent: 1200,
  },
];

describe("ListingsPanel", () => {
  it("renders listing thumbnails when available", () => {
    const withThumb: Listing = {
      ...listings[0]!,
      id: "thumb",
      title: "Photo flat",
      thumbnailUrl: "https://http2.mlstatic.com/example.webp",
    };

    render(
      <ListingsPanel
        listings={[withThumb, listings[1]!]}
        sort="yieldDesc"
        page={1}
        onSort={vi.fn()}
        onPage={vi.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: /view photo for photo flat/i })).toHaveAttribute(
      "href",
      withThumb.url,
    );
    expect(screen.getByRole("presentation")).toBeInTheDocument();
  });

  it("renders a sortable table with yield, price, and rent columns", () => {
    render(
      <ListingsPanel
        listings={listings}
        sort="yieldDesc"
        page={1}
        onSort={vi.fn()}
        onPage={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /sort by yield/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sort by price/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sort by est\. rent/i })).toBeInTheDocument();
    expect(screen.getByText("Higher yield flat")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /open listing/i })).toHaveLength(2);
  });

  it("sorts when a column header is clicked", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(
      <ListingsPanel
        listings={listings}
        sort="yieldDesc"
        page={1}
        onSort={onSort}
        onPage={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /sort by price/i }));
    expect(onSort).toHaveBeenCalledWith("priceDesc");
  });
});
