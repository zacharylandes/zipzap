import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SellVsBuyCalc } from "@/components/sell-vs-buy-calc";

describe("SellVsBuyCalc", () => {
  it("loads the requested defaults and a 25-year total", () => {
    render(<SellVsBuyCalc />);

    expect(screen.getByRole("heading", { name: "Sell vs buy" })).toBeInTheDocument();
    expect(screen.getByLabelText("House 1 value")).toHaveValue(620000);
    expect(screen.getByLabelText("House 1 remaining mortgage")).toHaveValue(390000);
    expect(screen.getByLabelText("House 1 principal monthly")).toHaveValue(850);
    expect(screen.getByLabelText("House 1 mortgage rate")).toHaveValue(6);
    expect(screen.getByLabelText("House 1 state")).toHaveValue("CA");
    expect(screen.getByLabelText("House 1 appreciation")).toHaveValue(4);
    expect(screen.getByLabelText("House 2 cost")).toHaveValue(200000);
    expect(screen.getByLabelText("House 2 rental potential monthly")).toHaveValue(1800);
    expect(screen.getByLabelText("House 2 state")).toHaveValue("PA");
    expect(screen.getByLabelText("House 2 appreciation")).toHaveValue(2);
    expect(screen.getByLabelText("House 2 S&P 500 invest monthly")).toHaveValue(500);
    expect(screen.getByRole("heading", { name: /keep house 1 · 25 years/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /sell & buy house 2 · 25 years/i })).toBeInTheDocument();
    expect(screen.getByText("Total wealth after 25 years")).toBeInTheDocument();
    expect(screen.getByText(/net monthly income/i)).toBeInTheDocument();
  });

  it("lowers house 2 net rent when the rental state has higher taxes", async () => {
    const user = userEvent.setup();
    render(<SellVsBuyCalc />);

    const net = screen.getByRole("region", { name: "House 2 net rent" });
    const paNet = net.textContent ?? "";

    await user.selectOptions(screen.getByLabelText("House 2 state"), "NJ");
    const njNet = net.textContent ?? "";

    expect(njNet).not.toEqual(paNet);
  });

  it("invests the unused amount under $200k as a one-time S&P lump", async () => {
    const user = userEvent.setup();
    render(<SellVsBuyCalc />);

    const cost = screen.getByLabelText("House 2 cost");
    await user.clear(cost);
    await user.type(cost, "150000");

    expect(screen.getByText("Unused of $200,000 house budget (one-time)")).toBeInTheDocument();
    expect(screen.getAllByText("$50,000").length).toBeGreaterThan(0);
  });
});
