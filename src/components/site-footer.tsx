import Link from "next/link";

export function SiteFooter() {
  return (
    <>
      <section className="hs-cta-band" id="cta">
        <div className="hs-content">
          <h2 className="hs-heading">We&apos;re always scanning.</h2>
          <p className="hs-copy">
            Rank US ZIPs by rent versus price, or pull live for-sale listings from the portals that
            actually list them.
          </p>
          <div className="hs-cta-band__actions">
            <Link href="/#search" className="hs-btn hs-btn--moonlight">
              Get started
            </Link>
            <Link href="/calc" className="hs-btn hs-btn--ghost-light">
              Sell vs buy calculator
            </Link>
          </div>
        </div>
      </section>
      <footer className="hs-footer">
        <div className="hs-content hs-footer__grid">
          <div className="hs-footer__brand">
            <Link href="/" className="hs-nav__logo" aria-label="House Search">
              <svg
                className="hs-nav__logo-mark"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 3.2 2.8 11h2.4v9.2h5.2v-6.1h3.2v6.1h5.2V11h2.4L12 3.2Z" />
              </svg>
              <span className="hs-nav__logo-word">House Search</span>
            </Link>
            <p>Rental-yield house search with a crime filter, plus live listings abroad.</p>
          </div>
          <div className="hs-footer__col">
            <h4>Search</h4>
            <Link href="/">US ZIP scan</Link>
            <Link href="/#search">Live listings</Link>
          </div>
          <div className="hs-footer__col">
            <h4>Tools</h4>
            <Link href="/calc">Sell vs buy</Link>
          </div>
          <div className="hs-footer__col">
            <h4>Sources</h4>
            <span>Realtor.com</span>
            <span>Zillow ZHVI / ZORI</span>
            <span>Numbeo</span>
          </div>
        </div>
        <div className="hs-content hs-footer__legal">
          <p>House Search. Yields are estimates, not investment advice.</p>
        </div>
      </footer>
    </>
  );
}
