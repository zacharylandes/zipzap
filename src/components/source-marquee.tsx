const SOURCES = [
  "Redfin",
  "Zillow ZHVI",
  "Zillow ZORI",
  "Numbeo",
  "Pisos.com",
  "Inmuebles24",
  "Mercado Libre",
  "Fincaraiz",
  "Immobiliare",
];

export function SourceMarquee() {
  const items = [...SOURCES, ...SOURCES];

  return (
    <section className="hs-insurance" aria-labelledby="sources-title">
      <div className="hs-insurance__inner">
        <div className="hs-insurance__copy">
          <h2 className="hs-insurance__title" id="sources-title">
            We pull from the portals and datasets that price real homes
          </h2>
          <div className="hs-insurance__actions">
            <a className="hs-btn hs-btn--moonlight" href="#search">
              Get started
            </a>
          </div>
        </div>
        <div className="hs-marquee" aria-hidden="true">
          <div className="hs-marquee__track">
            {items.map((name, index) => (
              <span key={`${name}-${index}`} className="hs-marquee__item">
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
