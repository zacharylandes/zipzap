export type StateHousingCosts = {
  code: string;
  name: string;
  /** Effective annual property tax as a share of home value. */
  propertyTaxRate: number;
  /** Typical annual homeowners insurance as a share of home value. */
  insuranceRate: number;
  /** Vacancy + management, as a share of gross rent. */
  landlordFeeRate: number;
};

const LANDLORD_FEE_RATE = 0.08;

function state(
  code: string,
  name: string,
  propertyTaxRate: number,
  insuranceRate: number,
): StateHousingCosts {
  return { code, name, propertyTaxRate, insuranceRate, landlordFeeRate: LANDLORD_FEE_RATE };
}

/** Tax Foundation-style effective property tax + typical insurance load. */
export const STATE_HOUSING_COSTS: Record<string, StateHousingCosts> = {
  AL: state("AL", "Alabama", 0.004, 0.0055),
  AK: state("AK", "Alaska", 0.0098, 0.0038),
  AZ: state("AZ", "Arizona", 0.0054, 0.0048),
  AR: state("AR", "Arkansas", 0.0062, 0.0062),
  CA: state("CA", "California", 0.0074, 0.0042),
  CO: state("CO", "Colorado", 0.0051, 0.0048),
  CT: state("CT", "Connecticut", 0.018, 0.0038),
  DE: state("DE", "Delaware", 0.0057, 0.0036),
  DC: state("DC", "District of Columbia", 0.0056, 0.004),
  FL: state("FL", "Florida", 0.0082, 0.0115),
  GA: state("GA", "Georgia", 0.0087, 0.0055),
  HI: state("HI", "Hawaii", 0.0028, 0.0045),
  ID: state("ID", "Idaho", 0.0063, 0.0042),
  IL: state("IL", "Illinois", 0.0208, 0.004),
  IN: state("IN", "Indiana", 0.0084, 0.0042),
  IA: state("IA", "Iowa", 0.0153, 0.0038),
  KS: state("KS", "Kansas", 0.0141, 0.0058),
  KY: state("KY", "Kentucky", 0.0086, 0.0052),
  LA: state("LA", "Louisiana", 0.0055, 0.0095),
  ME: state("ME", "Maine", 0.0124, 0.0036),
  MD: state("MD", "Maryland", 0.0105, 0.0038),
  MA: state("MA", "Massachusetts", 0.0114, 0.004),
  MI: state("MI", "Michigan", 0.0131, 0.0042),
  MN: state("MN", "Minnesota", 0.0105, 0.0045),
  MS: state("MS", "Mississippi", 0.0067, 0.0065),
  MO: state("MO", "Missouri", 0.0097, 0.0055),
  MT: state("MT", "Montana", 0.0074, 0.0048),
  NE: state("NE", "Nebraska", 0.0163, 0.0052),
  NV: state("NV", "Nevada", 0.0055, 0.0042),
  NH: state("NH", "New Hampshire", 0.0181, 0.0035),
  NJ: state("NJ", "New Jersey", 0.0223, 0.0038),
  NM: state("NM", "New Mexico", 0.0067, 0.005),
  NY: state("NY", "New York", 0.0172, 0.0045),
  NC: state("NC", "North Carolina", 0.0077, 0.0048),
  ND: state("ND", "North Dakota", 0.0098, 0.0042),
  OH: state("OH", "Ohio", 0.0156, 0.0038),
  OK: state("OK", "Oklahoma", 0.0087, 0.0078),
  OR: state("OR", "Oregon", 0.0087, 0.0036),
  PA: state("PA", "Pennsylvania", 0.0149, 0.0038),
  RI: state("RI", "Rhode Island", 0.0149, 0.0042),
  SC: state("SC", "South Carolina", 0.0057, 0.0055),
  SD: state("SD", "South Dakota", 0.0117, 0.005),
  TN: state("TN", "Tennessee", 0.0067, 0.0058),
  TX: state("TX", "Texas", 0.0168, 0.0072),
  UT: state("UT", "Utah", 0.0057, 0.0038),
  VT: state("VT", "Vermont", 0.0186, 0.0035),
  VA: state("VA", "Virginia", 0.0087, 0.004),
  WA: state("WA", "Washington", 0.0084, 0.0038),
  WV: state("WV", "West Virginia", 0.0058, 0.0048),
  WI: state("WI", "Wisconsin", 0.0161, 0.0036),
  WY: state("WY", "Wyoming", 0.0061, 0.0042),
};

export const STATE_OPTIONS = Object.values(STATE_HOUSING_COSTS).sort((a, b) =>
  a.name.localeCompare(b.name),
);

export function getStateCosts(code: string): StateHousingCosts {
  const normalized = code.trim().toUpperCase();
  const found = STATE_HOUSING_COSTS[normalized];
  if (!found) {
    throw new Error(`Unknown state: ${code}`);
  }
  return found;
}

export function propertyTaxRateForState(code: string): number {
  return STATE_HOUSING_COSTS[code.trim().toUpperCase()]?.propertyTaxRate ?? 0;
}

export function monthlyTaxesAndFees(
  homeValue: number,
  grossRentMonthly: number,
  costs: StateHousingCosts,
) {
  const propertyTax = (homeValue * costs.propertyTaxRate) / 12;
  const insurance = (homeValue * costs.insuranceRate) / 12;
  const landlordFees = grossRentMonthly * costs.landlordFeeRate;
  return {
    propertyTax,
    insurance,
    landlordFees,
    total: propertyTax + insurance + landlordFees,
  };
}
