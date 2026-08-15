import { describe, expect, it } from "vitest";
import {
  DEFAULT_SELL_VS_BUY_INPUT,
  HORIZON_YEARS,
  HOUSE_2_BUDGET,
  SP500_YIELD,
  amortizeMortgage,
  futureValueLumpSum,
  futureValueMonthlyInvestments,
  projectSellVsBuy,
} from "@/calc/sell-vs-buy";
import { getStateCosts } from "@/calc/state-costs";

describe("projectSellVsBuy", () => {
  it("uses the requested house 1 / house 2 defaults", () => {
    expect(DEFAULT_SELL_VS_BUY_INPUT).toMatchObject({
      house1Value: 620_000,
      house1Mortgage: 390_000,
      house1PrincipalMonthly: 850,
      house1MortgageRate: 0.06,
      house1State: "CA",
      house1Appreciation: 0.04,
      house2Cost: 200_000,
      house2GrossRentMonthly: 1_800,
      house2State: "PA",
      house2Appreciation: 0.02,
      house2MonthlyInvest: 500,
      sp500Yield: 0.08,
      years: 25,
    });
  });

  it("nets house 2 rent after PA property tax, insurance, and landlord fees", () => {
    const result = projectSellVsBuy(DEFAULT_SELL_VS_BUY_INPUT);
    const pa = getStateCosts("PA");
    const monthlyTax = (200_000 * pa.propertyTaxRate) / 12;
    const monthlyInsurance = (200_000 * pa.insuranceRate) / 12;
    const monthlyFees = 1_800 * pa.landlordFeeRate;
    const expectedNet = 1_800 - monthlyTax - monthlyInsurance - monthlyFees;

    expect(result.house2.netMonthlyIncome).toBeCloseTo(expectedNet, 6);
    expect(result.house2.netMonthlyIncome).toBeLessThan(1_800);
    expect(monthlyTax).toBeGreaterThan(200);
    expect(result.years).toBe(HORIZON_YEARS);
  });

  it("amortizes house 1 with a fixed payment so principal rises until payoff", () => {
    const firstMonthInterest = 390_000 * 0.06 / 12;
    const schedule = amortizeMortgage(390_000, 850, 0.06, 25);

    expect(schedule.monthlyPayment).toBeCloseTo(850 + firstMonthInterest, 6);
    expect(schedule.principalPaid).toBeGreaterThan(850 * 12 * 25);
    expect(schedule.remainingBalance).toBeLessThan(390_000 - 850 * 12 * 25);
    expect(schedule.paidOff).toBe(true);
    expect(schedule.remainingBalance).toBe(0);

    const yearOne = amortizeMortgage(390_000, 850, 0.06, 1);
    expect(yearOne.principalPaid).toBeGreaterThan(850 * 12);
    expect(yearOne.remainingBalance).toBeLessThan(390_000 - 850 * 12);
    expect(yearOne.paidOff).toBe(false);

    const zeroRate = amortizeMortgage(390_000, 850, 0, 25);
    expect(zeroRate.principalPaid).toBe(850 * 12 * 25);
    expect(zeroRate.remainingBalance).toBe(390_000 - 850 * 12 * 25);
  });

  it("keeps house 1 equity after 25 years of appreciation and amortized paydown", () => {
    const result = projectSellVsBuy(DEFAULT_SELL_VS_BUY_INPUT);
    const futureValue = 620_000 * (1.04) ** 25;
    const schedule = amortizeMortgage(390_000, 850, 0.06, 25);

    expect(result.keepHouse1.futureValue).toBeCloseTo(futureValue, 6);
    expect(result.keepHouse1.remainingMortgage).toBeCloseTo(schedule.remainingBalance, 6);
    expect(result.keepHouse1.principalPaid).toBeCloseTo(schedule.principalPaid, 6);
    expect(result.keepHouse1.monthlyPayment).toBeCloseTo(schedule.monthlyPayment, 6);
    expect(result.keepHouse1.equity).toBeCloseTo(futureValue - schedule.remainingBalance, 6);
    expect(result.keepHouse1.moneyMade).toBe(0);
    expect(result.keepHouse1.totalAfterYears).toBe(0);
  });

  it("counts money made as cash rent plus S&P profit, not leftover house equity", () => {
    const result = projectSellVsBuy(DEFAULT_SELL_VS_BUY_INPUT);
    const contributed =
      500 * 12 * 25 + result.sellAndBuy.unusedHouseBudget;
    const expectedMade =
      result.sellAndBuy.cumulativeNetRent +
      result.sellAndBuy.sp500FutureValue -
      contributed -
      result.sellAndBuy.remainingHouse2Mortgage;

    expect(result.keepHouse1.moneyMade).toBe(0);
    expect(result.sellAndBuy.moneyMade).toBeCloseTo(expectedMade, 6);
    expect(result.sellAndBuy.totalAfterYears).toBe(result.sellAndBuy.moneyMade);
    expect(result.sellAndBuy.moneyMade).toBeLessThan(
      result.sellAndBuy.cumulativeNetRent +
        result.sellAndBuy.sp500FutureValue +
        result.sellAndBuy.futureHouse2Value,
    );
  });

  it("sells house 1, buys house 2, and totals rent, S&P, and ending equity after 25 years", () => {
    const result = projectSellVsBuy(DEFAULT_SELL_VS_BUY_INPUT);
    const expectedSp500 = futureValueMonthlyInvestments(500, SP500_YIELD, 25);

    expect(result.sellAndBuy.cumulativeNetRent).toBeGreaterThan(300_000);
    expect(result.sellAndBuy.futureHouse2Value).toBeCloseTo(200_000 * 1.02 ** 25, 6);
    expect(result.sellAndBuy.unusedHouseBudget).toBe(0);
    expect(result.sellAndBuy.sp500MonthlyFutureValue).toBeCloseTo(expectedSp500, 6);
    expect(result.sellAndBuy.sp500FutureValue).toBeCloseTo(expectedSp500, 6);
    expect(result.sellAndBuy.totalAfterYears).toBeCloseTo(result.sellAndBuy.moneyMade, 6);
  });

  it("compounds house 2 S&P contributions monthly at 8%", () => {
    const monthly = 500;
    const years = 25;
    const r = 0.08 / 12;
    const n = years * 12;
    const expected = monthly * ((1 + r) ** n - 1) / r;

    expect(futureValueMonthlyInvestments(monthly, 0.08, years)).toBeCloseTo(expected, 6);
    expect(futureValueMonthlyInvestments(0, 0.08, years)).toBe(0);
    expect(futureValueMonthlyInvestments(100, 0, 2)).toBe(2_400);
  });

  it("reinvests any unused amount under the $200k house 2 budget as a one-time S&P lump", () => {
    expect(HOUSE_2_BUDGET).toBe(200_000);
    expect(futureValueLumpSum(50_000, 0.08, 25)).toBeCloseTo(50_000 * 1.08 ** 25, 6);
    expect(futureValueLumpSum(0, 0.08, 25)).toBe(0);

    const cheaper = projectSellVsBuy({
      ...DEFAULT_SELL_VS_BUY_INPUT,
      house2Cost: 150_000,
    });
    const atBudget = projectSellVsBuy(DEFAULT_SELL_VS_BUY_INPUT);
    const overBudget = projectSellVsBuy({
      ...DEFAULT_SELL_VS_BUY_INPUT,
      house2Cost: 220_000,
    });

    expect(cheaper.sellAndBuy.unusedHouseBudget).toBe(50_000);
    expect(cheaper.sellAndBuy.sp500LumpFutureValue).toBeCloseTo(50_000 * 1.08 ** 25, 6);
    expect(atBudget.sellAndBuy.unusedHouseBudget).toBe(0);
    expect(atBudget.sellAndBuy.sp500LumpFutureValue).toBe(0);
    expect(overBudget.sellAndBuy.unusedHouseBudget).toBe(0);
    expect(cheaper.sellAndBuy.sp500FutureValue).toBeCloseTo(
      cheaper.sellAndBuy.sp500MonthlyFutureValue + cheaper.sellAndBuy.sp500LumpFutureValue,
      6,
    );
    expect(cheaper.sellAndBuy.totalAfterYears).toBeCloseTo(cheaper.sellAndBuy.moneyMade, 6);
  });

  it("grows house 2 tax as the property appreciates, so later years net less than year 1", () => {
    const result = projectSellVsBuy(DEFAULT_SELL_VS_BUY_INPUT);
    expect(result.house2.year25NetMonthlyIncome).toBeLessThan(result.house2.netMonthlyIncome);
    expect(result.sellAndBuy.cumulativeNetRent).toBeLessThan(
      result.house2.netMonthlyIncome * 12 * 25,
    );
  });
});
