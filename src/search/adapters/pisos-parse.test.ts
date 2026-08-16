import { describe, expect, it } from "vitest";
import { parsePisosHtml, pisosHtmlLooksBlocked } from "@/search/adapters/pisos-parse";

const SAMPLE_PAGE = `
<html><body>
${"x".repeat(25_000)}
<div class="ad-preview">
  <img data-src="https://fotos.imghs.net/listing.jpg" alt="Piso en calle de la Princesa, 76" />
  <span class="ad-preview__price">1.600.000 €</span>
  <a href="/comprar/piso-gaztambide-65098413759_100500/" class="ad-preview__title">Piso en calle de la Princesa, 76</a>
  <p class="ad-preview__subtitle">Gaztambide (Distrito Chamber&#xED;. Madrid Capital)</p>
  <p class="ad-preview__char p-sm">3 habs.</p>
  <p class="ad-preview__char p-sm">3 ba&#xF1;os</p>
  <p class="ad-preview__char p-sm">155 m&#xB2;</p>
  <div class="contact-box" data-ad-price="1600000"></div>
</div>
</body></html>
`;

describe("pisosHtmlLooksBlocked", () => {
  it("rejects tiny or cardless HTML", () => {
    expect(pisosHtmlLooksBlocked("<html>idealista.com</html>")).toBe(true);
    expect(pisosHtmlLooksBlocked(`${"x".repeat(25_000)}<p>no cards</p>`)).toBe(true);
  });

  it("accepts pages with listing cards", () => {
    expect(pisosHtmlLooksBlocked(SAMPLE_PAGE)).toBe(false);
  });
});

describe("parsePisosHtml", () => {
  it("extracts listing cards from search HTML", () => {
    const listings = parsePisosHtml(SAMPLE_PAGE, {
      country: "ES",
      location: "madrid-madrid",
      listingType: "sale",
    });

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      title: "Piso en calle de la Princesa, 76",
      price: 1_600_000,
      currency: "EUR",
      bedrooms: 3,
      bathrooms: 3,
      area: 155,
      location: "Gaztambide (Distrito Chamberí. Madrid Capital)",
      thumbnailUrl: "https://fotos.imghs.net/listing.jpg",
      url: "/comprar/piso-gaztambide-65098413759_100500/",
    });
  });
});
