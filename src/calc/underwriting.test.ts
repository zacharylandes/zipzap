import { describe, expect, it } from "vitest";
import {
  UNDERWRITING_DEFAULTS,
  loanAmountFromPayment,
  monthlyMortgagePayment,
  resolveMonthlyRent,
  scoreUnderwritingConfidence,
  stressTestUnderwriting,
  underwrite,
  type UnderwritingInput,
} from "@/calc/underwriting";

const SAMPLE: UnderwritingInput = {
  purchasePrice: 180_000,
  monthlyRent: 1_500,
  rentEstimateSource: "zori",
  bedrooms: 3,
  bathrooms: 2,
  area: 1_400,
  propertyTaxRate: 0.01,
  insuranceRate: 0.005,
};

function expectedPayment(loan: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 12;
  const n = years * 12;
  if (monthlyRate === 0) return loan / n;
  return (loan * monthlyRate * (1 + monthlyRate) ** n) / ((1 + monthlyRate) ** n - 1);
}

describe("UNDERWRITING_DEFAULTS", () => {
  it("centralizes the acquisition assumptions", () => {
    expect(UNDERWRITING_DEFAULTS).toMatchObject({
      vacancyRate: 0.05,
      managementRate: 0.08,
      maintenanceRate: 0.05,
      reservesRate: 0.05,
      interestRate: 0.07,
      amortizationYears: 30,
      maxLTV: 0.75,
      targetDSCR: 1.25,
    });
  });
});

describe("monthlyMortgagePayment", () => {
  it("uses standard amortizing mortgage math", () => {
    const payment = monthlyMortgagePayment(150_000, 0.07, 30);
    expect(payment).toBeCloseTo(expectedPayment(150_000, 0.07, 30), 6);
    expect(payment).toBeGreaterThan(990);
    expect(payment).toBeLessThan(1_010);
  });

  it("divides principal evenly when the rate is zero", () => {
    expect(monthlyMortgagePayment(120_000, 0, 30)).toBeCloseTo(120_000 / 360, 6);
  });

  it("returns 0 for a missing loan", () => {
    expect(monthlyMortgagePayment(0, 0.07, 30)).toBe(0);
    expect(monthlyMortgagePayment(-1, 0.07, 30)).toBe(0);
  });
});

describe("loanAmountFromPayment", () => {
  it("inverts the mortgage payment for reverse DSCR sizing", () => {
    const payment = monthlyMortgagePayment(150_000, 0.07, 30);
    expect(loanAmountFromPayment(payment, 0.07, 30)).toBeCloseTo(150_000, 4);
  });

  it("multiplies payment by term when the rate is zero", () => {
    expect(loanAmountFromPayment(400, 0, 30)).toBeCloseTo(400 * 360, 6);
  });
});

describe("resolveMonthlyRent", () => {
  it("prefers actual lease rent over comps, local data, and ZIP rent", () => {
    const resolved = resolveMonthlyRent({
      actualMonthlyRent: 2_100,
      compsMonthlyRent: 1_900,
      estimatedMonthlyRent: 1_400,
      rentEstimateSource: "zori",
    });
    expect(resolved.monthlyRent).toBe(2_100);
    expect(resolved.source).toBe("actual");
    expect(resolved.label).toBe("Actual lease");
  });

  it("uses rental comps when no actual rent exists", () => {
    const resolved = resolveMonthlyRent({
      compsMonthlyRent: 1_850,
      estimatedMonthlyRent: 1_400,
      rentEstimateSource: "zori",
      rentCompCount: 3,
    });
    expect(resolved.monthlyRent).toBe(1_850);
    expect(resolved.source).toBe("comps");
    expect(resolved.label).toBe("Rental comps");
  });

  it("uses property-adjusted local rent before ZIP typical rent", () => {
    const resolved = resolveMonthlyRent({
      estimatedMonthlyRent: 890,
      rentEstimateSource: "numbeo",
    });
    expect(resolved.monthlyRent).toBe(890);
    expect(resolved.source).toBe("property");
    expect(resolved.label).toBe("Property + local rent");
  });

  it("falls back to ZIP typical rent", () => {
    const resolved = resolveMonthlyRent({
      estimatedMonthlyRent: 1_400,
      rentEstimateSource: "zori",
    });
    expect(resolved.monthlyRent).toBe(1_400);
    expect(resolved.source).toBe("zori");
    expect(resolved.label).toBe("ZIP median");
  });
});

describe("underwrite", () => {
  it("builds NOI from gross rent, vacancy, and estimated expenses", () => {
    const result = underwrite(SAMPLE, UNDERWRITING_DEFAULTS);
    const grossRent = 1_500 * 12;
    const vacancyLoss = grossRent * 0.05;
    const egi = grossRent - vacancyLoss;
    const taxes = 180_000 * 0.01;
    const insurance = 180_000 * 0.005;
    const management = grossRent * 0.08;
    const maintenance = grossRent * 0.05;
    const reserves = grossRent * 0.05;
    const opex = taxes + insurance + management + maintenance + reserves;

    expect(result.annualGrossRent).toBe(grossRent);
    expect(result.vacancyLoss).toBeCloseTo(vacancyLoss);
    expect(result.effectiveGrossIncome).toBeCloseTo(egi);
    expect(result.propertyTaxes).toBeCloseTo(taxes);
    expect(result.insurance).toBeCloseTo(insurance);
    expect(result.management).toBeCloseTo(management);
    expect(result.maintenance).toBeCloseTo(maintenance);
    expect(result.reserves).toBeCloseTo(reserves);
    expect(result.utilities).toBe(0);
    expect(result.hoa).toBe(0);
    expect(result.operatingExpenses).toBeCloseTo(opex);
    expect(result.noi).toBeCloseTo(egi - opex);
    expect(result.expenseFlags.propertyTaxes).toBe("estimated");
    expect(result.expenseFlags.insurance).toBe("estimated");
    expect(result.expenseFlags.utilities).toBe("assumed");
    expect(result.expenseFlags.hoa).toBe("assumed");
  });

  it("uses known taxes, insurance, HOA, and utilities instead of silent zeros", () => {
    const result = underwrite(
      {
        ...SAMPLE,
        propertyTaxesAnnual: 2_400,
        insuranceAnnual: 1_200,
        hoaMonthly: 150,
        utilitiesMonthly: 80,
      },
      UNDERWRITING_DEFAULTS,
    );
    expect(result.propertyTaxes).toBe(2_400);
    expect(result.insurance).toBe(1_200);
    expect(result.hoa).toBe(1_800);
    expect(result.utilities).toBe(960);
    expect(result.expenseFlags.propertyTaxes).toBe("known");
    expect(result.expenseFlags.insurance).toBe("known");
    expect(result.expenseFlags.hoa).toBe("known");
    expect(result.expenseFlags.utilities).toBe("known");
  });

  it("calculates DSCR from NOI and amortizing debt service", () => {
    const result = underwrite(SAMPLE, UNDERWRITING_DEFAULTS);
    const loan = 180_000 * 0.75;
    const monthly = expectedPayment(loan, 0.07, 30);
    expect(result.loanAmount).toBe(loan);
    expect(result.monthlyDebtService).toBeCloseTo(monthly, 6);
    expect(result.annualDebtService).toBeCloseTo(monthly * 12, 6);
    expect(result.dscr).toBeCloseTo(result.noi! / (monthly * 12), 6);
  });

  it("solves reverse DSCR for max loan and purchase price", () => {
    const result = underwrite(SAMPLE, UNDERWRITING_DEFAULTS);
    const maxDebtService = result.noi! / 1.25;
    const maxLoan = loanAmountFromPayment(maxDebtService / 12, 0.07, 30);
    expect(result.maxAnnualDebtService).toBeCloseTo(maxDebtService, 6);
    expect(result.maxLoanAmount).toBeCloseTo(maxLoan, 4);
    expect(result.dscrSupportedPurchasePrice).toBeCloseTo(maxLoan / 0.75, 4);
    expect(result.priceGap).toBeCloseTo(result.dscrSupportedPurchasePrice! - 180_000, 4);
    expect(result.equityRequired).toBeCloseTo(180_000 - result.loanAmount!, 4);
    expect(result.downPayment).toBeCloseTo(180_000 * 0.25, 4);
  });

  it("returns null credit metrics when price or rent is missing", () => {
    const result = underwrite(
      { ...SAMPLE, purchasePrice: null, monthlyRent: null },
      UNDERWRITING_DEFAULTS,
    );
    expect(result.noi).toBeNull();
    expect(result.dscr).toBeNull();
    expect(result.dscrSupportedPurchasePrice).toBeNull();
  });
});

describe("stressTestUnderwriting", () => {
  it("recalculates DSCR for rent, vacancy, rate, and combined shocks", () => {
    const base = underwrite(SAMPLE, UNDERWRITING_DEFAULTS);
    const stressed = stressTestUnderwriting(SAMPLE, UNDERWRITING_DEFAULTS);

    expect(stressed.base).toBeCloseTo(base.dscr!, 6);
    expect(stressed.rentDown5).toBeLessThan(stressed.base);
    expect(stressed.rentDown10).toBeLessThan(stressed.rentDown5);
    expect(stressed.vacancy10).toBeLessThan(stressed.base);
    expect(stressed.rateUp1).toBeLessThan(stressed.base);
    expect(stressed.combined).toBeLessThan(stressed.rentDown10);
    expect(stressed.combined).toBeLessThan(stressed.rateUp1);
  });
});

describe("scoreUnderwritingConfidence", () => {
  it("is High only with property rent, known expenses, sqft, and multiple comps", () => {
    expect(
      scoreUnderwritingConfidence({
        rentSource: "actual",
        hasKnownTaxes: true,
        hasKnownHoa: true,
        hasKnownSqft: true,
        rentCompCount: 3,
        hasMostPropertyCharacteristics: true,
        usesEstimatedTaxesOrInsurance: false,
      }),
    ).toBe("High");
  });

  it("is Medium for ZIP rent with known taxes and complete property data", () => {
    expect(
      scoreUnderwritingConfidence({
        rentSource: "zori",
        hasKnownTaxes: true,
        hasKnownHoa: false,
        hasKnownSqft: true,
        rentCompCount: 0,
        hasMostPropertyCharacteristics: true,
        usesEstimatedTaxesOrInsurance: false,
      }),
    ).toBe("Medium");
  });

  it("is Low for ZIP rent with estimated taxes and incomplete property data", () => {
    expect(
      scoreUnderwritingConfidence({
        rentSource: "zori",
        hasKnownTaxes: false,
        hasKnownHoa: false,
        hasKnownSqft: false,
        rentCompCount: 0,
        hasMostPropertyCharacteristics: false,
        usesEstimatedTaxesOrInsurance: true,
      }),
    ).toBe("Low");
  });
});
