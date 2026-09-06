"use client";

import { UNDERWRITING_DEFAULTS } from "@/calc/underwriting";
import { useUnderwritingAssumptions } from "@/components/underwriting-provider";

function percentField(
  value: number,
  onChange: (value: number) => void,
  label: string,
  step = 0.5,
) {
  return (
    <label className="hs-field">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        max={100}
        step={step}
        value={Number((value * 100).toFixed(2))}
        onChange={(event) => onChange(Number(event.target.value) / 100 || 0)}
        aria-label={label}
      />
    </label>
  );
}

export function UnderwritingAssumptionsForm({ compact = false }: { compact?: boolean }) {
  const { assumptions, patchAssumptions, resetAssumptions } = useUnderwritingAssumptions();

  return (
    <details className="hs-uw-assumptions" open={!compact}>
      <summary>Modeled underwriting assumptions</summary>
      <p className="hs-uw__note">
        These are editable estimates, not lender terms. Missing expenses use the values below
        instead of zero.
      </p>
      <div className="hs-form__grid hs-uw-assumptions__grid">
        {percentField(assumptions.vacancyRate, (vacancyRate) => patchAssumptions({ vacancyRate }), "Vacancy")}
        {percentField(
          assumptions.managementRate,
          (managementRate) => patchAssumptions({ managementRate }),
          "Management",
        )}
        {percentField(
          assumptions.maintenanceRate,
          (maintenanceRate) => patchAssumptions({ maintenanceRate }),
          "Maintenance",
        )}
        {percentField(assumptions.reservesRate, (reservesRate) => patchAssumptions({ reservesRate }), "Reserves")}
        {percentField(
          assumptions.propertyTaxRate,
          (propertyTaxRate) => patchAssumptions({ propertyTaxRate }),
          "Fallback tax",
        )}
        {percentField(
          assumptions.insuranceRate,
          (insuranceRate) => patchAssumptions({ insuranceRate }),
          "Fallback insurance",
        )}
        {percentField(
          assumptions.interestRate,
          (interestRate) => patchAssumptions({ interestRate }),
          "Interest rate",
        )}
        {percentField(assumptions.maxLTV, (maxLTV) => patchAssumptions({ maxLTV }), "Max LTV")}
        <label className="hs-field">
          <span>Target DSCR</span>
          <input
            type="number"
            min={0.5}
            max={3}
            step={0.05}
            value={assumptions.targetDSCR}
            onChange={(event) =>
              patchAssumptions({ targetDSCR: Number(event.target.value) || UNDERWRITING_DEFAULTS.targetDSCR })
            }
            aria-label="Target DSCR"
          />
        </label>
        <label className="hs-field">
          <span>Amortization (years)</span>
          <input
            type="number"
            min={1}
            max={40}
            step={1}
            value={assumptions.amortizationYears}
            onChange={(event) =>
              patchAssumptions({
                amortizationYears: Number(event.target.value) || UNDERWRITING_DEFAULTS.amortizationYears,
              })
            }
            aria-label="Amortization years"
          />
        </label>
        <label className="hs-field">
          <span>Owner utilities $/mo</span>
          <input
            type="number"
            min={0}
            step={25}
            value={assumptions.ownerPaidUtilitiesMonthly}
            onChange={(event) =>
              patchAssumptions({ ownerPaidUtilitiesMonthly: Number(event.target.value) || 0 })
            }
            aria-label="Owner-paid utilities per month"
          />
        </label>
        <label className="hs-field">
          <span>HOA $/mo</span>
          <input
            type="number"
            min={0}
            step={25}
            value={assumptions.hoaMonthly}
            onChange={(event) => patchAssumptions({ hoaMonthly: Number(event.target.value) || 0 })}
            aria-label="HOA per month"
          />
        </label>
      </div>
      <button type="button" className="hs-btn hs-btn--ghost" onClick={resetAssumptions}>
        Reset assumptions
      </button>
    </details>
  );
}
