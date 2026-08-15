import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ZipListings } from "@/components/zip-listings";
import { grossYield } from "@/markets/rank";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/search/use-search-request", () => ({
  useSearchRequest: () => ({
    loading: true,
    elapsedSec: 3,
    error: null,
    result: null,
    run: vi.fn(),
    abort: vi.fn(),
  }),
}));

describe("ZipListings", () => {
  it("links back to the ZIP list", () => {
    render(
      <ZipListings
        zip="73103"
        query={{
          minPrice: 90_000,
          maxPrice: 240_000,
          crimeFilter: "averageOrBetter",
          sort: "priceDesc",
          page: 1,
        }}
        market={{
          zip: "73103",
          city: "Oklahoma City",
          state: "OK",
          county: "Oklahoma",
          zhvi: 180_000,
          zori: 1_400,
          grossYield: grossYield(1_400, 180_000)!,
          crimeRate: 250,
          crimeVsNational: 250 / 370,
          population: 12_000,
        }}
        backHref="/?minPrice=90000&maxPrice=240000&crimeFilter=averageOrBetter"
      />,
    );
    expect(screen.getByRole("link", { name: "Back to ZIP list" })).toHaveAttribute(
      "href",
      "/?minPrice=90000&maxPrice=240000&crimeFilter=averageOrBetter",
    );
    expect(screen.getByRole("heading", { name: /oklahoma city/i })).toBeInTheDocument();
  });
});
