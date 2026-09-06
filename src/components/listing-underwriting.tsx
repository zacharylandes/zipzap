"use client";

import { listingUnderwritingInput, underwriteListing } from "@/calc/underwrite-sources";
import { stressTestUnderwriting } from "@/calc/underwriting";
import { UnderwritingAssumptionsForm } from "@/components/underwriting-assumptions";
import { useUnderwritingAssumptions } from "@/components/underwriting-provider";
import { formatDscr, formatMoney, formatPercent, formatSignedMoney } from "@/components/money";
import type { MarketRow } from "@/markets/rank";
import type { Listing } from "@/search/schema";

function Row({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="hs-uw__row">
      <dt>{label}</dt>
      <dd>
        {value}
        {note ? <span className="hs-uw__flag">{note}</span> : null}
      </dd>
    </div>
  );
}

function flagNote(flag: "known" | "estimated" | "assumed"): string | undefined {
  if (flag === "known") return undefined;
  if (flag === "estimated") return "estimated";
  return "assumed";
}

export function ListingUnderwriting({
  listing,
  market,
}: {
  listing: Listing;
  market?: MarketRow | null;
}) {
  const { assumptions } = useUnderwritingAssumptions();
  const result = underwriteListing(listing, assumptions, market);
  const stress = stressTestUnderwriting(listingUnderwritingInput(listing, market), assumptions);
  const currency = listing.currency;
  const pricePerSqft =
    listing.price != null && listing.area != null && listing.area > 0
      ? listing.price / listing.area
      : null;

  return (
    <section className="hs-uw" aria-label="Modeled underwriting">
      <p className="hs-uw__disclaimer">
        Modeled from assumptions. This is not lender approval or financial advice.
      </p>

      <div className="hs-uw__hero">
        <p className="hs-uw__dscr">{formatDscr(result.dscr)}</p>
        <p className="hs-uw__dscr-label">Modeled DSCR at asking price</p>
        <p className="hs-uw__confidence">
          Confidence: {result.confidence} · data quality, not investment safety
        </p>
      </div>

      <div className="hs-uw__price-gap">
        <div>
          <span className="hs-uw__kicker">Asking price</span>
          <strong>{formatMoney(listing.price, currency)}</strong>
        </div>
        <div>
          <span className="hs-uw__kicker">DSCR-supported price</span>
          <strong>{formatMoney(result.dscrSupportedPurchasePrice, currency)}</strong>
        </div>
        <div>
          <span className="hs-uw__kicker">Price gap</span>
          <strong>{formatSignedMoney(result.priceGap, currency)}</strong>
        </div>
      </div>

      <div className="hs-uw__grid">
        <div>
          <h4 className="hs-uw__heading">Property</h4>
          <dl className="hs-uw__dl">
            <Row label="Purchase price" value={formatMoney(listing.price, currency)} />
            <Row label="Beds" value={listing.bedrooms != null ? String(listing.bedrooms) : "—"} />
            <Row label="Baths" value={listing.bathrooms != null ? String(listing.bathrooms) : "—"} />
            <Row
              label="Sqft"
              value={
                listing.area != null
                  ? `${listing.area} ${listing.areaUnit ?? ""}`.trim()
                  : "—"
              }
            />
            <Row
              label="Price/sqft"
              value={
                pricePerSqft != null
                  ? `${formatMoney(pricePerSqft, currency)}/${listing.areaUnit ?? "sqft"}`
                  : "—"
              }
            />
          </dl>
        </div>

        <div>
          <h4 className="hs-uw__heading">Income</h4>
          <dl className="hs-uw__dl">
            <Row
              label="Monthly rent"
              value={formatMoney(result.monthlyRent, currency)}
              note={result.rentEstimateLabel}
            />
            <Row label="Annual gross rent" value={formatMoney(result.annualGrossRent, currency)} />
            <Row
              label="Vacancy"
              value={formatMoney(result.vacancyLoss, currency)}
              note={formatPercent(result.vacancyRate)}
            />
            <Row
              label="Effective gross income"
              value={formatMoney(result.effectiveGrossIncome, currency)}
            />
          </dl>
        </div>

        <div>
          <h4 className="hs-uw__heading">Expenses</h4>
          <dl className="hs-uw__dl">
            <Row
              label="Taxes"
              value={formatMoney(result.propertyTaxes, currency)}
              note={flagNote(result.expenseFlags.propertyTaxes)}
            />
            <Row
              label="Insurance"
              value={formatMoney(result.insurance, currency)}
              note={flagNote(result.expenseFlags.insurance)}
            />
            <Row
              label="Management"
              value={formatMoney(result.management, currency)}
              note={flagNote(result.expenseFlags.management)}
            />
            <Row
              label="Maintenance"
              value={formatMoney(result.maintenance, currency)}
              note={flagNote(result.expenseFlags.maintenance)}
            />
            <Row
              label="Utilities"
              value={formatMoney(result.utilities, currency)}
              note={flagNote(result.expenseFlags.utilities)}
            />
            <Row
              label="HOA"
              value={formatMoney(result.hoa, currency)}
              note={flagNote(result.expenseFlags.hoa)}
            />
            <Row
              label="Reserves"
              value={formatMoney(result.reserves, currency)}
              note={flagNote(result.expenseFlags.reserves)}
            />
          </dl>
        </div>

        <div>
          <h4 className="hs-uw__heading">Financing</h4>
          <dl className="hs-uw__dl">
            <Row label="Down payment" value={formatMoney(result.downPayment, currency)} />
            <Row label="LTV" value={formatPercent(result.ltv)} />
            <Row label="Loan amount" value={formatMoney(result.loanAmount, currency)} />
            <Row label="Interest rate" value={formatPercent(result.interestRate)} />
            <Row label="Amortization" value={`${result.amortizationYears} years`} />
            <Row label="Monthly payment" value={formatMoney(result.monthlyDebtService, currency)} />
            <Row
              label="Annual debt service"
              value={formatMoney(result.annualDebtService, currency)}
            />
          </dl>
        </div>
      </div>

      <div>
        <h4 className="hs-uw__heading">Result</h4>
        <dl className="hs-uw__dl">
          <Row label="NOI" value={formatMoney(result.noi, currency)} />
          <Row label="DSCR" value={formatDscr(result.dscr)} />
          <Row label="Target DSCR" value={formatDscr(result.targetDscr)} />
          <Row label="DSCR-supported loan" value={formatMoney(result.maxLoanAmount, currency)} />
          <Row
            label="DSCR-supported purchase price"
            value={formatMoney(result.dscrSupportedPurchasePrice, currency)}
          />
          <Row label="Equity required" value={formatMoney(result.equityRequired, currency)} />
          <Row label="Price gap" value={formatSignedMoney(result.priceGap, currency)} />
        </dl>
      </div>

      <div>
        <h4 className="hs-uw__heading">Stress test</h4>
        <p className="hs-uw__note">Modeled DSCR if rent, vacancy, or rate moves against the deal.</p>
        <dl className="hs-uw__dl">
          <Row label="Base" value={formatDscr(stress.base)} />
          <Row label="Rent -5%" value={formatDscr(stress.rentDown5)} />
          <Row label="Rent -10%" value={formatDscr(stress.rentDown10)} />
          <Row label="Vacancy 10%" value={formatDscr(stress.vacancy10)} />
          <Row label="Rate +1%" value={formatDscr(stress.rateUp1)} />
          <Row label="Combined stress" value={formatDscr(stress.combined)} />
        </dl>
      </div>

      <UnderwritingAssumptionsForm />
    </section>
  );
}
