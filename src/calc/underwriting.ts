export const UNDERWRITING_DEFAULTS = {
  vacancyRate: 0.05,
  managementRate: 0.08,
  maintenanceRate: 0.05,
  reservesRate: 0.05,
  interestRate: 0.07,
  amortizationYears: 30,
  maxLTV: 0.75,
  targetDSCR: 1.25,
  propertyTaxRate: 0.01,
  insuranceRate: 0.005,
  ownerPaidUtilitiesMonthly: 0,
  hoaMonthly: 0,
} as const;

export type UnderwritingAssumptions = {
  vacancyRate: number;
  managementRate: number;
  maintenanceRate: number;
  reservesRate: number;
  interestRate: number;
  amortizationYears: number;
  maxLTV: number;
  targetDSCR: number;
  propertyTaxRate: number;
  insuranceRate: number;
  ownerPaidUtilitiesMonthly: number;
  hoaMonthly: number;
};

export type RentEstimateSource = "actual" | "comps" | "property" | "numbeo" | "zori";

export type UnderwritingConfidence = "High" | "Medium" | "Low";

export type ExpenseFlag = "known" | "estimated" | "assumed";

export type UnderwritingInput = {
  purchasePrice: number | null;
  monthlyRent: number | null;
  rentEstimateSource?: RentEstimateSource | "numbeo" | "zori" | null;
  actualMonthlyRent?: number | null;
  compsMonthlyRent?: number | null;
  estimatedMonthlyRent?: number | null;
  rentCompCount?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area?: number | null;
  propertyTaxesAnnual?: number | null;
  insuranceAnnual?: number | null;
  hoaMonthly?: number | null;
  utilitiesMonthly?: number | null;
  propertyTaxRate?: number | null;
  insuranceRate?: number | null;
};

export type ResolvedRent = {
  monthlyRent: number | null;
  source: RentEstimateSource | null;
  label: string;
};

export type ExpenseFlags = {
  propertyTaxes: ExpenseFlag;
  insurance: ExpenseFlag;
  management: ExpenseFlag;
  maintenance: ExpenseFlag;
  utilities: ExpenseFlag;
  hoa: ExpenseFlag;
  reserves: ExpenseFlag;
};

export type UnderwritingResult = {
  monthlyRent: number | null;
  rentEstimateSource: RentEstimateSource | null;
  rentEstimateLabel: string;
  annualGrossRent: number | null;
  vacancyRate: number;
  vacancyLoss: number | null;
  effectiveGrossIncome: number | null;
  propertyTaxes: number | null;
  insurance: number | null;
  management: number | null;
  maintenance: number | null;
  utilities: number | null;
  hoa: number | null;
  reserves: number | null;
  operatingExpenses: number | null;
  noi: number | null;
  interestRate: number;
  amortizationYears: number;
  ltv: number;
  loanAmount: number | null;
  downPayment: number | null;
  monthlyDebtService: number | null;
  annualDebtService: number | null;
  dscr: number | null;
  targetDscr: number;
  maxAnnualDebtService: number | null;
  maxLoanAmount: number | null;
  dscrSupportedPurchasePrice: number | null;
  priceGap: number | null;
  equityRequired: number | null;
  confidence: UnderwritingConfidence;
  expenseFlags: ExpenseFlags;
};

export type StressTestResult = {
  base: number;
  rentDown5: number;
  rentDown10: number;
  vacancy10: number;
  rateUp1: number;
  combined: number;
};

export type ConfidenceSignals = {
  rentSource: RentEstimateSource | null;
  hasKnownTaxes: boolean;
  hasKnownHoa: boolean;
  hasKnownSqft: boolean;
  rentCompCount: number;
  hasMostPropertyCharacteristics: boolean;
  usesEstimatedTaxesOrInsurance: boolean;
};

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

export function monthlyMortgagePayment(
  loanAmount: number,
  annualRate: number,
  years: number,
): number {
  const principal = finite(loanAmount);
  const rate = finite(annualRate);
  const termYears = finite(years);
  if (!(principal > 0) || !(termYears > 0)) return 0;
  const n = termYears * 12;
  const monthlyRate = rate / 12;
  if (monthlyRate === 0) return principal / n;
  const growth = (1 + monthlyRate) ** n;
  return (principal * monthlyRate * growth) / (growth - 1);
}

export function loanAmountFromPayment(
  monthlyPayment: number,
  annualRate: number,
  years: number,
): number {
  const payment = finite(monthlyPayment);
  const rate = finite(annualRate);
  const termYears = finite(years);
  if (!(payment > 0) || !(termYears > 0)) return 0;
  const n = termYears * 12;
  const monthlyRate = rate / 12;
  if (monthlyRate === 0) return payment * n;
  const growth = (1 + monthlyRate) ** n;
  return (payment * (growth - 1)) / (monthlyRate * growth);
}

export function rentEstimateLabel(source: RentEstimateSource | null): string {
  switch (source) {
    case "actual":
      return "Actual lease";
    case "comps":
      return "Rental comps";
    case "property":
    case "numbeo":
      return "Property + local rent";
    case "zori":
      return "ZIP median";
    case null:
      return "Unavailable";
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

export function resolveMonthlyRent(input: {
  actualMonthlyRent?: number | null;
  compsMonthlyRent?: number | null;
  estimatedMonthlyRent?: number | null;
  monthlyRent?: number | null;
  rentEstimateSource?: RentEstimateSource | "numbeo" | "zori" | null;
  rentCompCount?: number | null;
}): ResolvedRent {
  const actual = positive(input.actualMonthlyRent);
  if (actual != null) {
    return { monthlyRent: actual, source: "actual", label: rentEstimateLabel("actual") };
  }

  const comps = positive(input.compsMonthlyRent);
  if (comps != null) {
    return { monthlyRent: comps, source: "comps", label: rentEstimateLabel("comps") };
  }

  const estimated = positive(input.estimatedMonthlyRent) ?? positive(input.monthlyRent);
  const rawSource = input.rentEstimateSource;
  if (estimated != null && (rawSource === "numbeo" || rawSource === "property")) {
    return { monthlyRent: estimated, source: "property", label: rentEstimateLabel("property") };
  }
  if (estimated != null) {
    return { monthlyRent: estimated, source: "zori", label: rentEstimateLabel("zori") };
  }

  return { monthlyRent: null, source: null, label: rentEstimateLabel(null) };
}

export function scoreUnderwritingConfidence(signals: ConfidenceSignals): UnderwritingConfidence {
  const propertyRent = signals.rentSource === "actual" || signals.rentSource === "comps";
  if (
    propertyRent &&
    signals.hasKnownTaxes &&
    signals.hasKnownHoa &&
    signals.hasKnownSqft &&
    signals.rentCompCount >= 2
  ) {
    return "High";
  }
  if (
    (propertyRent || signals.rentSource === "zori" || signals.rentSource === "property") &&
    signals.hasKnownTaxes &&
    signals.hasMostPropertyCharacteristics
  ) {
    return "Medium";
  }
  return "Low";
}

function annualFromMonthly(value: number | null | undefined, fallbackMonthly: number): {
  annual: number;
  flag: ExpenseFlag;
} {
  if (value != null && Number.isFinite(value)) {
    return { annual: value * 12, flag: "known" };
  }
  return { annual: fallbackMonthly * 12, flag: fallbackMonthly === 0 ? "assumed" : "estimated" };
}

function annualKnownOrRate(
  knownAnnual: number | null | undefined,
  price: number,
  rate: number,
): { annual: number; flag: ExpenseFlag } {
  if (knownAnnual != null && Number.isFinite(knownAnnual) && knownAnnual >= 0) {
    return { annual: knownAnnual, flag: "known" };
  }
  return { annual: price * rate, flag: "estimated" };
}

export function underwrite(
  input: UnderwritingInput,
  assumptions: UnderwritingAssumptions = UNDERWRITING_DEFAULTS,
): UnderwritingResult {
  const resolved = resolveMonthlyRent({
    actualMonthlyRent: input.actualMonthlyRent,
    compsMonthlyRent: input.compsMonthlyRent,
    estimatedMonthlyRent: input.estimatedMonthlyRent ?? input.monthlyRent,
    monthlyRent: input.monthlyRent,
    rentEstimateSource: input.rentEstimateSource,
    rentCompCount: input.rentCompCount,
  });
  const price = positive(input.purchasePrice);
  const monthlyRent = resolved.monthlyRent;
  const ltv = assumptions.maxLTV;
  const taxRate = input.propertyTaxRate ?? assumptions.propertyTaxRate;
  const insuranceRate = input.insuranceRate ?? assumptions.insuranceRate;
  const hasKnownTaxes = input.propertyTaxesAnnual != null;
  const hasKnownInsurance = input.insuranceAnnual != null;
  const hasKnownHoa = input.hoaMonthly != null;
  const hasKnownSqft = input.area != null && input.area > 0;
  const characteristicCount = [input.bedrooms != null, input.bathrooms != null, hasKnownSqft].filter(
    Boolean,
  ).length;

  const confidence = scoreUnderwritingConfidence({
    rentSource: resolved.source,
    hasKnownTaxes,
    hasKnownHoa,
    hasKnownSqft,
    rentCompCount: input.rentCompCount ?? 0,
    hasMostPropertyCharacteristics: characteristicCount >= 2,
    usesEstimatedTaxesOrInsurance: !hasKnownTaxes || !hasKnownInsurance,
  });

  const empty: UnderwritingResult = {
    monthlyRent,
    rentEstimateSource: resolved.source,
    rentEstimateLabel: resolved.label,
    annualGrossRent: null,
    vacancyRate: assumptions.vacancyRate,
    vacancyLoss: null,
    effectiveGrossIncome: null,
    propertyTaxes: null,
    insurance: null,
    management: null,
    maintenance: null,
    utilities: null,
    hoa: null,
    reserves: null,
    operatingExpenses: null,
    noi: null,
    interestRate: assumptions.interestRate,
    amortizationYears: assumptions.amortizationYears,
    ltv,
    loanAmount: null,
    downPayment: null,
    monthlyDebtService: null,
    annualDebtService: null,
    dscr: null,
    targetDscr: assumptions.targetDSCR,
    maxAnnualDebtService: null,
    maxLoanAmount: null,
    dscrSupportedPurchasePrice: null,
    priceGap: null,
    equityRequired: null,
    confidence,
    expenseFlags: {
      propertyTaxes: hasKnownTaxes ? "known" : "estimated",
      insurance: hasKnownInsurance ? "known" : "estimated",
      management: "estimated",
      maintenance: "estimated",
      utilities: input.utilitiesMonthly != null ? "known" : "assumed",
      hoa: hasKnownHoa ? "known" : "assumed",
      reserves: "estimated",
    },
  };

  if (monthlyRent == null || price == null) {
    return empty;
  }

  const annualGrossRent = monthlyRent * 12;
  const vacancyLoss = annualGrossRent * assumptions.vacancyRate;
  const effectiveGrossIncome = annualGrossRent - vacancyLoss;
  const taxes = annualKnownOrRate(input.propertyTaxesAnnual, price, taxRate);
  const insurance = annualKnownOrRate(input.insuranceAnnual, price, insuranceRate);
  const utilities = annualFromMonthly(
    input.utilitiesMonthly,
    assumptions.ownerPaidUtilitiesMonthly,
  );
  const hoa = annualFromMonthly(input.hoaMonthly, assumptions.hoaMonthly);
  const management = annualGrossRent * assumptions.managementRate;
  const maintenance = annualGrossRent * assumptions.maintenanceRate;
  const reserves = annualGrossRent * assumptions.reservesRate;
  const operatingExpenses =
    taxes.annual +
    insurance.annual +
    management +
    maintenance +
    utilities.annual +
    hoa.annual +
    reserves;
  const noi = effectiveGrossIncome - operatingExpenses;
  const loanAmount = price * ltv;
  const downPayment = price - loanAmount;
  const monthlyDebtService = monthlyMortgagePayment(
    loanAmount,
    assumptions.interestRate,
    assumptions.amortizationYears,
  );
  const annualDebtService = monthlyDebtService * 12;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : null;
  const maxAnnualDebtService = assumptions.targetDSCR > 0 ? noi / assumptions.targetDSCR : null;
  const maxLoanAmount =
    maxAnnualDebtService != null
      ? loanAmountFromPayment(
          maxAnnualDebtService / 12,
          assumptions.interestRate,
          assumptions.amortizationYears,
        )
      : null;
  const dscrSupportedPurchasePrice =
    maxLoanAmount != null && ltv > 0 ? maxLoanAmount / ltv : null;
  const priceGap = dscrSupportedPurchasePrice != null ? dscrSupportedPurchasePrice - price : null;

  return {
    monthlyRent,
    rentEstimateSource: resolved.source,
    rentEstimateLabel: resolved.label,
    annualGrossRent,
    vacancyRate: assumptions.vacancyRate,
    vacancyLoss,
    effectiveGrossIncome,
    propertyTaxes: taxes.annual,
    insurance: insurance.annual,
    management,
    maintenance,
    utilities: utilities.annual,
    hoa: hoa.annual,
    reserves,
    operatingExpenses,
    noi,
    interestRate: assumptions.interestRate,
    amortizationYears: assumptions.amortizationYears,
    ltv,
    loanAmount,
    downPayment,
    monthlyDebtService,
    annualDebtService,
    dscr,
    targetDscr: assumptions.targetDSCR,
    maxAnnualDebtService,
    maxLoanAmount,
    dscrSupportedPurchasePrice,
    priceGap,
    equityRequired: downPayment,
    confidence,
    expenseFlags: {
      propertyTaxes: taxes.flag,
      insurance: insurance.flag,
      management: "estimated",
      maintenance: "estimated",
      utilities: utilities.flag,
      hoa: hoa.flag,
      reserves: "estimated",
    },
  };
}

export function stressTestUnderwriting(
  input: UnderwritingInput,
  assumptions: UnderwritingAssumptions = UNDERWRITING_DEFAULTS,
): StressTestResult {
  const rent = resolveMonthlyRent({
    actualMonthlyRent: input.actualMonthlyRent,
    compsMonthlyRent: input.compsMonthlyRent,
    estimatedMonthlyRent: input.estimatedMonthlyRent ?? input.monthlyRent,
    monthlyRent: input.monthlyRent,
    rentEstimateSource: input.rentEstimateSource,
  }).monthlyRent;

  const dscrFor = (next: UnderwritingInput, nextAssumptions: UnderwritingAssumptions): number => {
    return underwrite(next, nextAssumptions).dscr ?? 0;
  };

  return {
    base: dscrFor(input, assumptions),
    rentDown5: dscrFor({ ...input, monthlyRent: rent == null ? null : rent * 0.95 }, assumptions),
    rentDown10: dscrFor({ ...input, monthlyRent: rent == null ? null : rent * 0.9 }, assumptions),
    vacancy10: dscrFor(input, { ...assumptions, vacancyRate: 0.1 }),
    rateUp1: dscrFor(input, { ...assumptions, interestRate: assumptions.interestRate + 0.01 }),
    combined: dscrFor(
      { ...input, monthlyRent: rent == null ? null : rent * 0.9 },
      {
        ...assumptions,
        vacancyRate: 0.1,
        interestRate: assumptions.interestRate + 0.01,
      },
    ),
  };
}

export function mergeAssumptions(
  overrides: Partial<UnderwritingAssumptions> | null | undefined,
): UnderwritingAssumptions {
  return { ...UNDERWRITING_DEFAULTS, ...overrides };
}
