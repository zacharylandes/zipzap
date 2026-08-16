"use client";

import { useMemo, useState } from "react";
import { DEFAULT_SELL_VS_BUY_INPUT, HOUSE_2_BUDGET, projectSellVsBuy } from "@/calc/sell-vs-buy";
import { STATE_OPTIONS } from "@/calc/state-costs";
import { PageHero } from "@/components/page-hero";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function pct(rate: number): string {
  return `${(rate * 100).toFixed(2)}%`;
}

export function SellVsBuyCalc() {
  const [house1Value, setHouse1Value] = useState(DEFAULT_SELL_VS_BUY_INPUT.house1Value);
  const [house1Mortgage, setHouse1Mortgage] = useState(DEFAULT_SELL_VS_BUY_INPUT.house1Mortgage);
  const [house1PrincipalMonthly, setHouse1PrincipalMonthly] = useState(
    DEFAULT_SELL_VS_BUY_INPUT.house1PrincipalMonthly,
  );
  const [house1RatePct, setHouse1RatePct] = useState(
    DEFAULT_SELL_VS_BUY_INPUT.house1MortgageRate * 100,
  );
  const [house1State, setHouse1State] = useState(DEFAULT_SELL_VS_BUY_INPUT.house1State);
  const [house1AprPct, setHouse1AprPct] = useState(DEFAULT_SELL_VS_BUY_INPUT.house1Appreciation * 100);
  const [house2Cost, setHouse2Cost] = useState(DEFAULT_SELL_VS_BUY_INPUT.house2Cost);
  const [house2GrossRentMonthly, setHouse2GrossRentMonthly] = useState(
    DEFAULT_SELL_VS_BUY_INPUT.house2GrossRentMonthly,
  );
  const [house2State, setHouse2State] = useState(DEFAULT_SELL_VS_BUY_INPUT.house2State);
  const [house2AprPct, setHouse2AprPct] = useState(DEFAULT_SELL_VS_BUY_INPUT.house2Appreciation * 100);
  const [house2MonthlyInvest, setHouse2MonthlyInvest] = useState(
    DEFAULT_SELL_VS_BUY_INPUT.house2MonthlyInvest,
  );

  const result = useMemo(
    () =>
      projectSellVsBuy({
        house1Value,
        house1Mortgage,
        house1PrincipalMonthly,
        house1MortgageRate: house1RatePct / 100,
        house1State,
        house1Appreciation: house1AprPct / 100,
        house2Cost,
        house2GrossRentMonthly,
        house2State,
        house2Appreciation: house2AprPct / 100,
        house2MonthlyInvest,
        sp500Yield: DEFAULT_SELL_VS_BUY_INPUT.sp500Yield,
        years: 25,
      }),
    [
      house1Value,
      house1Mortgage,
      house1PrincipalMonthly,
      house1RatePct,
      house1State,
      house1AprPct,
      house2Cost,
      house2GrossRentMonthly,
      house2State,
      house2AprPct,
      house2MonthlyInvest,
    ],
  );

  const keepWins = result.keepHouse1.totalAfterYears >= result.sellAndBuy.totalAfterYears;
  const gap = Math.abs(result.keepHouse1.totalAfterYears - result.sellAndBuy.totalAfterYears);

  return (
    <div className="hs-app">
      <PageHero
        compact
        title="Sell vs buy"
        sub="Keep house 1, or sell it and buy house 2 as a rental. Compare total wealth after 25 years — home equity plus cash, rent, and investments."
      />

      <section className="hs-section">
        <div className="hs-content hs-calc">
          <div className="hs-calc__houses">
            <form className="hs-form" aria-label="House 1, keep">
              <h2 className="hs-heading hs-heading--sm">House 1 · keep</h2>
              <p className="hs-copy">
                Current home. The loan uses a fixed monthly payment; principal rises each month until
                payoff.
              </p>
              <div className="hs-form__grid hs-calc__grid">
                <label className="hs-field">
                  <span>Value</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={house1Value}
                    onChange={(e) => setHouse1Value(Number(e.target.value))}
                    aria-label="House 1 value"
                  />
                </label>
                <label className="hs-field">
                  <span>Remaining mortgage</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={house1Mortgage}
                    onChange={(e) => setHouse1Mortgage(Number(e.target.value))}
                    aria-label="House 1 remaining mortgage"
                  />
                </label>
                <label className="hs-field">
                  <span>Current principal monthly</span>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={house1PrincipalMonthly}
                    onChange={(e) => setHouse1PrincipalMonthly(Number(e.target.value))}
                    aria-label="House 1 principal monthly"
                  />
                </label>
                <label className="hs-field">
                  <span>Mortgage rate % / year</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={house1RatePct}
                    onChange={(e) => setHouse1RatePct(Number(e.target.value))}
                    aria-label="House 1 mortgage rate"
                  />
                </label>
                <label className="hs-field">
                  <span>State</span>
                  <select
                    value={house1State}
                    onChange={(e) => setHouse1State(e.target.value)}
                    aria-label="House 1 state"
                  >
                    {STATE_OPTIONS.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="hs-field">
                  <span>Appreciation % / year</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={house1AprPct}
                    onChange={(e) => setHouse1AprPct(Number(e.target.value))}
                    aria-label="House 1 appreciation"
                  />
                </label>
              </div>
            </form>

            <form className="hs-form" aria-label="House 2, buy as rental">
              <h2 className="hs-heading hs-heading--sm">House 2 · buy &amp; rent</h2>
              <p className="hs-copy">
                Gross rent minus {result.house2.stateName} property tax, insurance, and 8% landlord
                fees. Any amount under {money.format(HOUSE_2_BUDGET)} is invested once in the S&amp;P
                500 at 8%, with profits reinvested.
              </p>
              <div className="hs-form__grid hs-calc__grid">
                <label className="hs-field">
                  <span>Cost</span>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={house2Cost}
                    onChange={(e) => setHouse2Cost(Number(e.target.value))}
                    aria-label="House 2 cost"
                  />
                </label>
                <label className="hs-field">
                  <span>Gross rent monthly</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={house2GrossRentMonthly}
                    onChange={(e) => setHouse2GrossRentMonthly(Number(e.target.value))}
                    aria-label="House 2 rental potential monthly"
                  />
                </label>
                <label className="hs-field">
                  <span>State</span>
                  <select
                    value={house2State}
                    onChange={(e) => setHouse2State(e.target.value)}
                    aria-label="House 2 state"
                  >
                    {STATE_OPTIONS.map((state) => (
                      <option key={state.code} value={state.code}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="hs-field">
                  <span>Appreciation % / year</span>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={house2AprPct}
                    onChange={(e) => setHouse2AprPct(Number(e.target.value))}
                    aria-label="House 2 appreciation"
                  />
                </label>
                <label className="hs-field">
                  <span>S&amp;P 500 invest monthly</span>
                  <input
                    type="number"
                    min={0}
                    step={50}
                    value={house2MonthlyInvest}
                    onChange={(e) => setHouse2MonthlyInvest(Number(e.target.value))}
                    aria-label="House 2 S&P 500 invest monthly"
                  />
                </label>
              </div>
            </form>
          </div>

          <div className="hs-calc__verdict" aria-live="polite">
            <p className="hs-eyebrow">Total wealth after 25 years</p>
            <h2 className="hs-heading hs-heading--sm">
              {keepWins ? "Keeping house 1" : "Selling and buying house 2"} comes out ahead by{" "}
              {money.format(gap)}
            </h2>
            <div className="hs-calc__totals">
              <article className={keepWins ? "hs-calc__path hs-calc__path--win" : "hs-calc__path"}>
                <p className="hs-card__source">Keep house 1</p>
                <p className="hs-calc__stat">{money.format(result.keepHouse1.totalAfterYears)}</p>
                <p className="hs-copy">
                  Home equity after appreciation and paydown. No rental or S&amp;P cash on this path.
                </p>
              </article>
              <article className={!keepWins ? "hs-calc__path hs-calc__path--win" : "hs-calc__path"}>
                <p className="hs-card__source">Sell house 1, buy house 2</p>
                <p className="hs-calc__stat">{money.format(result.sellAndBuy.totalAfterYears)}</p>
                <p className="hs-copy">
                  House 2 equity, net rent, S&amp;P, and leftover sale cash. Cash-only profit:{" "}
                  {money.format(result.sellAndBuy.moneyMade)}.
                </p>
              </article>
            </div>
          </div>

          <div className="hs-calc__breakdown">
            <section className="hs-form" aria-label="Keep house 1 after 25 years">
              <h2 className="hs-heading hs-heading--sm">Keep house 1 · 25 years</h2>
              <p className="hs-copy">Cash made is the left-hand total. House leftover is not cash.</p>
              <dl className="hs-calc__dl">
                <dt>Cash rent collected</dt>
                <dd>{money.format(0)}</dd>
                <dt>S&amp;P profit</dt>
                <dd>{money.format(0)}</dd>
                <dt>Fixed monthly P&amp;I</dt>
                <dd>{money.format(result.keepHouse1.monthlyPayment)}</dd>
                <dt>Principal paid (amortized)</dt>
                <dd>{money.format(result.keepHouse1.principalPaid)}</dd>
                <dt>Remaining mortgage</dt>
                <dd>
                  {result.keepHouse1.paidOff
                    ? "Paid off"
                    : `−${money.format(result.keepHouse1.remainingMortgage)}`}
                </dd>
                <dt>House 1 future value (not counted)</dt>
                <dd>{money.format(result.keepHouse1.futureValue)}</dd>
                <dt>Still in the house (not counted)</dt>
                <dd>{money.format(result.keepHouse1.equity)}</dd>
                <dt>Money made</dt>
                <dd>{money.format(result.keepHouse1.moneyMade)}</dd>
              </dl>
            </section>

            <section className="hs-form" aria-label="Sell and buy house 2 after 25 years">
              <h2 className="hs-heading hs-heading--sm">Sell &amp; buy house 2 · 25 years</h2>
              <p className="hs-copy">Same path as the right total above.</p>

              <section aria-label="House 2 net rent">
                <h3 className="hs-calc__subhead">Year 1 rent</h3>
                <dl className="hs-calc__dl">
                  <dt>Gross rent</dt>
                  <dd>{money.format(house2GrossRentMonthly)}</dd>
                  <dt>Property tax ({pct(result.house2.propertyTaxRate)})</dt>
                  <dd>−{money.format(result.house2.monthlyPropertyTax)}</dd>
                  <dt>Insurance ({pct(result.house2.insuranceRate)})</dt>
                  <dd>−{money.format(result.house2.monthlyInsurance)}</dd>
                  <dt>Landlord fees ({pct(result.house2.landlordFeeRate)} of rent)</dt>
                  <dd>−{money.format(result.house2.monthlyFees)}</dd>
                  <dt>Net monthly income</dt>
                  <dd>{money.format(result.house2.netMonthlyIncome)}</dd>
                </dl>
              </section>

              <h3 className="hs-calc__subhead">If you sell today</h3>
              <dl className="hs-calc__dl">
                <dt>Sale costs (6%)</dt>
                <dd>−{money.format(result.sellAndBuy.saleCosts)}</dd>
                <dt>Net proceeds after the mortgage</dt>
                <dd>{money.format(result.sellAndBuy.netProceeds)}</dd>
                <dt>House 2 purchase costs (3%)</dt>
                <dd>−{money.format(result.sellAndBuy.purchaseCosts)}</dd>
                <dt>Cash left after buying</dt>
                <dd>{money.format(result.sellAndBuy.leftoverCash)}</dd>
                <dt>House 2 loan if proceeds fall short</dt>
                <dd>−{money.format(result.sellAndBuy.remainingHouse2Mortgage)}</dd>
              </dl>

              <h3 className="hs-calc__subhead">Year 25 position</h3>
              <dl className="hs-calc__dl">
                <dt>Year-25 net monthly rent</dt>
                <dd>{money.format(result.house2.year25NetMonthlyIncome)}</dd>
                <dt>25-year rental income</dt>
                <dd>{money.format(result.sellAndBuy.cumulativeNetRent)}</dd>
                <dt>S&amp;P contributions</dt>
                <dd>−{money.format(result.sellAndBuy.sp500Contributed)}</dd>
                <dt>S&amp;P profit</dt>
                <dd>{money.format(result.sellAndBuy.sp500Gain)}</dd>
                <dt>
                  S&amp;P 500 monthly ({money.format(house2MonthlyInvest)}/mo at{" "}
                  {pct(DEFAULT_SELL_VS_BUY_INPUT.sp500Yield)})
                </dt>
                <dd>{money.format(result.sellAndBuy.sp500MonthlyFutureValue)}</dd>
                <dt>
                  Unused of {money.format(HOUSE_2_BUDGET)} house budget (one-time)
                </dt>
                <dd>{money.format(result.sellAndBuy.unusedHouseBudget)}</dd>
                <dt>
                  S&amp;P 500 lump ({money.format(result.sellAndBuy.unusedHouseBudget)} at{" "}
                  {pct(DEFAULT_SELL_VS_BUY_INPUT.sp500Yield)}, reinvested)
                </dt>
                <dd>{money.format(result.sellAndBuy.sp500LumpFutureValue)}</dd>
                <dt>House 2 future value (not counted)</dt>
                <dd>{money.format(result.sellAndBuy.futureHouse2Value)}</dd>
                <dt>Leftover sale cash (returned equity, not counted)</dt>
                <dd>{money.format(result.sellAndBuy.leftoverCash)}</dd>
                <dt>Remaining house 2 loan</dt>
                <dd>−{money.format(result.sellAndBuy.remainingHouse2Mortgage)}</dd>
                <dt>Money made</dt>
                <dd>{money.format(result.sellAndBuy.moneyMade)}</dd>
              </dl>
            </section>
          </div>

          <p className="hs-calc__notes">
            Money made is cash: net rent plus S&amp;P profit (gains above what you contributed).
            Leftover house value is shown but not counted. House 1 uses a normal amortizing loan:
            today&apos;s principal plus interest becomes a fixed monthly P&amp;I payment, then
            principal rises each month until the balance is gone. House 1 state is for context;
            taxes and insurance there are not subtracted from the keep path.
            House 2 tax and insurance scale with appreciated value, so net rent falls if gross rent
            stays flat. Leftover cash earns 0%. A purchase shortfall stays as unpaid house 2 debt.
            Monthly S&amp;P 500 contributions compound at 8% and are added on top of rental cash.
            If house 2 costs less than {money.format(HOUSE_2_BUDGET)}, the unused amount is invested
            once in the S&amp;P 500 at 8% with profits reinvested.
          </p>
        </div>
      </section>
    </div>
  );
}
