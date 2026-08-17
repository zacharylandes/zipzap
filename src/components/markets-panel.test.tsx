import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MarketsPanel } from "@/components/markets-panel";
import { grossYield, type MarketRow } from "@/markets/rank";

const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
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

const sample: MarketRow = {
  zip: "73103",
  city: "Oklahoma City",
  state: "OK",
  county: "Oklahoma",
  zhvi: 180_000,
  zori: 1_400,
  propertyTaxRate: 0.0087,
  grossYield: grossYield(1_400, 180_000, 0.0087)!,
  crimeRate: 250,
  crimeVsNational: 250 / 370,
  population: 12_000,
};

const href =
  "/zips/73103?minPrice=90000&maxPrice=240000&crimeFilter=averageOrBetter";

const panelProps = {
  markets: [sample],
  states: ["OK"],
  minPrice: 90000,
  maxPrice: 240000,
  crimeFilter: "averageOrBetter" as const,
  state: "",
  sort: "priceDesc" as const,
  page: 1,
  loading: false,
  zipHref: () => href,
  onMinPrice: () => {},
  onMaxPrice: () => {},
  onCrimeFilter: () => {},
  onState: () => {},
  onSort: () => {},
  onPage: () => {},
};

describe("MarketsPanel", () => {
  it("links View photos to the ZIP listings page", () => {
    render(<MarketsPanel {...panelProps} />);
    expect(screen.getByRole("link", { name: "View photos" })).toHaveAttribute("href", href);
  });

  it("navigates when the row is clicked", async () => {
    const user = userEvent.setup();
    push.mockClear();
    render(<MarketsPanel {...panelProps} />);
    await user.click(screen.getByText("8.5%"));
    expect(push).toHaveBeenCalledWith(href);
  });

  it("shows the state property tax rate next to yield", () => {
    render(<MarketsPanel {...panelProps} />);
    expect(screen.getByRole("columnheader", { name: /prop\.? tax/i })).toBeInTheDocument();
    expect(screen.getByText("0.87%")).toBeInTheDocument();
  });

  it("sorts when column headers are clicked", async () => {
    const user = userEvent.setup();
    const onSort = vi.fn();
    render(<MarketsPanel {...panelProps} onSort={onSort} />);

    await user.click(screen.getByRole("button", { name: /sort by typical price/i }));
    expect(onSort).toHaveBeenCalledWith("priceAsc");

    await user.click(screen.getByRole("button", { name: /sort by typical rent/i }));
    expect(onSort).toHaveBeenCalledWith("rentDesc");

    await user.click(screen.getByRole("button", { name: /sort by yield/i }));
    expect(onSort).toHaveBeenCalledWith("yieldDesc");
  });

  it("shows pagination when there are many ZIPs", () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      ...sample,
      zip: String(70000 + index).padStart(5, "0"),
    }));
    render(<MarketsPanel {...panelProps} markets={many} total={30} />);
    expect(screen.getAllByText(/ZIPs 1–25 of 30/).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Next" })[0]).toBeEnabled();
  });
});
