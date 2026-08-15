import { getStateCosts, monthlyTaxesAndFees } from "@/calc/state-costs";

export const HORIZON_YEARS = 25;
export const SELLING_COST_RATE = 0.06;
export const BUYING_COST_RATE = 0.03;
export const SP500_YIELD = 0.08;
export const HOUSE_2_BUDGET = 200_000;

export function futureValueLumpSum(
  principal: number,
  annualRate: number,
  years: number,
): number {
  const amount = Math.max(0, finite(principal));
  const rate = Math.max(0, finite(annualRate));
  const horizon = Math.max(0, finite(years));
  if (amount === 0 || horizon === 0) return 0;
  return amount * (1 + rate) ** horizon;
}

export type AmortizationResult = {
  remainingBalance: number;
  principalPaid: number;
  interestPaid: number;
  monthlyPayment: number;
  monthsElapsed: number;
  paidOff: boolean;
};

export function amortizeMortgage(
  balance: number,
  currentMonthlyPrincipal: number,
  annualRate: number,
  years: number,
): AmortizationResult {
  let remaining = Math.max(0, finite(balance));
  const startingPrincipal = Math.max(0, finite(currentMonthlyPrincipal));
  const monthlyRate = Math.max(0, finite(annualRate)) / 12;
  const months = Math.max(0, Math.round(finite(years) * 12));
  const monthlyPayment = startingPrincipal + remaining * monthlyRate;

  let principalPaid = 0;
  let interestPaid = 0;
  let elapsed = 0;

  for (let month = 0; month < months && remaining > 0; month += 1) {
    const interest = remaining * monthlyRate;
    const principal = Math.min(Math.max(0, monthlyPayment - interest), remaining);
    remaining -= principal;
    principalPaid += principal;
    interestPaid += interest;
    elapsed += 1;
  }

  if (remaining < 0.005) remaining = 0;

  return {
    remainingBalance: remaining,
    principalPaid,
    interestPaid,
    monthlyPayment,
    monthsElapsed: elapsed,
    paidOff: remaining === 0,
  };
}

export function futureValueMonthlyInvestments(
  monthly: number,
  annualRate: number,
  years: number,
): number {
  const payment = Math.max(0, finite(monthly));
  const rate = Math.max(0, finite(annualRate));
  const horizon = Math.max(0, finite(years));
  const n = horizon * 12;
  if (payment === 0 || n === 0) return 0;
  if (rate === 0) return payment * n;
  const r = rate / 12;
  return payment * ((1 + r) ** n - 1) / r;
}

export type SellVsBuyInput = {
  house1Value: number;
  house1Mortgage: number;
  house1PrincipalMonthly: number;
  house1MortgageRate: number;
  house1State: string;
  house1Appreciation: number;
  house2Cost: number;
  house2GrossRentMonthly: number;
  house2State: string;
  house2Appreciation: number;
  house2MonthlyInvest: number;
  sp500Yield: number;
  years: number;
};

export const DEFAULT_SELL_VS_BUY_INPUT: SellVsBuyInput = {
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
  sp500Yield: SP500_YIELD,
  years: HORIZON_YEARS,
};

export type SellVsBuyResult = {
  years: number;
  house2: {
    stateName: string;
    propertyTaxRate: number;
    insuranceRate: number;
    landlordFeeRate: number;
    monthlyPropertyTax: number;
    monthlyInsurance: number;
    monthlyFees: number;
    netMonthlyIncome: number;
    year25NetMonthlyIncome: number;
  };
  keepHouse1: {
    futureValue: number;
    remainingMortgage: number;
    principalPaid: number;
    monthlyPayment: number;
    paidOff: boolean;
    equity: number;
    moneyMade: number;
    totalAfterYears: number;
  };
  sellAndBuy: {
    saleCosts: number;
    netProceeds: number;
    purchaseCosts: number;
    leftoverCash: number;
    remainingHouse2Mortgage: number;
    futureHouse2Value: number;
    cumulativeNetRent: number;
    unusedHouseBudget: number;
    sp500MonthlyFutureValue: number;
    sp500LumpFutureValue: number;
    sp500FutureValue: number;
    sp500Contributed: number;
    sp500Gain: number;
    moneyMade: number;
    totalAfterYears: number;
  };
};

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function projectSellVsBuy(raw: SellVsBuyInput): SellVsBuyResult {
  const input: SellVsBuyInput = {
    ...raw,
    house1Value: Math.max(0, finite(raw.house1Value)),
    house1Mortgage: Math.max(0, finite(raw.house1Mortgage)),
    house1PrincipalMonthly: Math.max(0, finite(raw.house1PrincipalMonthly)),
    house1MortgageRate: Math.max(0, finite(raw.house1MortgageRate)),
    house1Appreciation: Math.max(0, finite(raw.house1Appreciation)),
    house2Cost: Math.max(0, finite(raw.house2Cost)),
    house2GrossRentMonthly: Math.max(0, finite(raw.house2GrossRentMonthly)),
    house2Appreciation: Math.max(0, finite(raw.house2Appreciation)),
    house2MonthlyInvest: Math.max(0, finite(raw.house2MonthlyInvest)),
    sp500Yield: Math.max(0, finite(raw.sp500Yield)),
    years: Math.max(1, Math.round(finite(raw.years) || HORIZON_YEARS)),
  };

  const house2Costs = getStateCosts(input.house2State);
  const year1Carry = monthlyTaxesAndFees(
    input.house2Cost,
    input.house2GrossRentMonthly,
    house2Costs,
  );
  const netMonthlyIncome = input.house2GrossRentMonthly - year1Carry.total;

  const futureValue = input.house1Value * (1 + input.house1Appreciation) ** input.years;
  const schedule = amortizeMortgage(
    input.house1Mortgage,
    input.house1PrincipalMonthly,
    input.house1MortgageRate,
    input.years,
  );
  const principalPaid = schedule.principalPaid;
  const remainingMortgage = schedule.remainingBalance;
  const equity = futureValue - remainingMortgage;

  const saleCosts = input.house1Value * SELLING_COST_RATE;
  const netProceeds = input.house1Value - input.house1Mortgage - saleCosts;
  const purchaseCosts = input.house2Cost * BUYING_COST_RATE;
  const cashAtClose = netProceeds - input.house2Cost - purchaseCosts;
  const leftoverCash = Math.max(0, cashAtClose);
  const remainingHouse2Mortgage = Math.max(0, -cashAtClose);

  let cumulativeNetRent = 0;
  let year25NetMonthlyIncome = netMonthlyIncome;
  for (let year = 0; year < input.years; year += 1) {
    const value = input.house2Cost * (1 + input.house2Appreciation) ** year;
    const carry = monthlyTaxesAndFees(value, input.house2GrossRentMonthly, house2Costs);
    const net = input.house2GrossRentMonthly - carry.total;
    cumulativeNetRent += net * 12;
    if (year === input.years - 1) {
      year25NetMonthlyIncome = net;
    }
  }

  const futureHouse2Value = input.house2Cost * (1 + input.house2Appreciation) ** input.years;
  const unusedHouseBudget = Math.max(0, HOUSE_2_BUDGET - input.house2Cost);
  const sp500MonthlyFutureValue = futureValueMonthlyInvestments(
    input.house2MonthlyInvest,
    input.sp500Yield,
    input.years,
  );
  const sp500LumpFutureValue = futureValueLumpSum(
    unusedHouseBudget,
    input.sp500Yield,
    input.years,
  );
  const sp500FutureValue = sp500MonthlyFutureValue + sp500LumpFutureValue;
  const sp500Contributed = input.house2MonthlyInvest * 12 * input.years + unusedHouseBudget;
  const sp500Gain = sp500FutureValue - sp500Contributed;
  const keepMoneyMade = 0;
  const sellMoneyMade = cumulativeNetRent + sp500Gain - remainingHouse2Mortgage;

  return {
    years: input.years,
    house2: {
      stateName: house2Costs.name,
      propertyTaxRate: house2Costs.propertyTaxRate,
      insuranceRate: house2Costs.insuranceRate,
      landlordFeeRate: house2Costs.landlordFeeRate,
      monthlyPropertyTax: year1Carry.propertyTax,
      monthlyInsurance: year1Carry.insurance,
      monthlyFees: year1Carry.landlordFees,
      netMonthlyIncome,
      year25NetMonthlyIncome,
    },
    keepHouse1: {
      futureValue,
      remainingMortgage,
      principalPaid,
      monthlyPayment: schedule.monthlyPayment,
      paidOff: schedule.paidOff,
      equity,
      moneyMade: keepMoneyMade,
      totalAfterYears: keepMoneyMade,
    },
    sellAndBuy: {
      saleCosts,
      netProceeds,
      purchaseCosts,
      leftoverCash,
      remainingHouse2Mortgage,
      futureHouse2Value,
      cumulativeNetRent,
      unusedHouseBudget,
      sp500MonthlyFutureValue,
      sp500LumpFutureValue,
      sp500FutureValue,
      sp500Contributed,
      sp500Gain,
      moneyMade: sellMoneyMade,
      totalAfterYears: sellMoneyMade,
    },
  };
}
