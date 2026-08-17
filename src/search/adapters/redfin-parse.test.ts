import { describe, expect, it } from "vitest";
import {
  parseRedfinHtml,
  redfinHtmlLooksBlocked,
} from "@/search/adapters/redfin-parse";

const SAMPLE_PAGE = `
<html><body>
${"x".repeat(25_000)}
<script type="application/ld+json">
{"@context":"http://schema.org","@type":"Product","name":"4672 N Troost Ave, Tulsa, OK 74126","offers":{"@type":"Offer","price":"160000","priceCurrency":"USD"},"url":"https://www.redfin.com/OK/Tulsa/4672-N-Troost-Ave-74126/home/74225593"}
</script>
<script type="application/ld+json">
{"@context":"http://schema.org","name":"4672 N Troost Ave, Tulsa, OK 74126","url":"https://www.redfin.com/OK/Tulsa/4672-N-Troost-Ave-74126/home/74225593","address":{"@type":"PostalAddress","streetAddress":"4672 N Troost Ave","addressLocality":"Tulsa","addressRegion":"OK","postalCode":"74126"},"numberOfRooms":3,"floorSize":{"@type":"QuantitativeValue","value":1104,"unitCode":"FTK"},"@type":"SingleFamilyResidence"}
</script>
<div id="MapHomeCard_0">
  <img src="https://ssl.cdn-redfin.com/photo/164/islphoto/995/genIslnoResize.2629995_1.webp" />
  <a href="https://www.redfin.com/OK/Tulsa/4672-N-Troost-Ave-74126/home/74225593">4672 N Troost Ave</a>
</div>
</body></html>
`;

describe("redfinHtmlLooksBlocked", () => {
  it("rejects WAF challenges and cardless HTML", () => {
    expect(redfinHtmlLooksBlocked("<html>awsWafCookieDomainList</html>")).toBe(true);
    expect(redfinHtmlLooksBlocked(`${"x".repeat(25_000)}<p>no homes</p>`)).toBe(true);
  });

  it("accepts pages with Redfin listing JSON-LD", () => {
    expect(redfinHtmlLooksBlocked(SAMPLE_PAGE)).toBe(false);
  });
});

describe("parseRedfinHtml", () => {
  it("joins Product price, residence facts, and card photo", () => {
    const listings = parseRedfinHtml(SAMPLE_PAGE, {
      country: "US",
      location: "Tulsa, OK",
      listingType: "sale",
      zip: "74126",
    });

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      title: "4672 N Troost Ave, Tulsa, OK 74126",
      price: 160_000,
      currency: "USD",
      bedrooms: 3,
      area: 1104,
      areaUnit: "sqft",
      location: "Tulsa, OK",
      thumbnailUrl:
        "https://ssl.cdn-redfin.com/photo/164/islphoto/995/genIslnoResize.2629995_1.webp",
      url: "https://www.redfin.com/OK/Tulsa/4672-N-Troost-Ave-74126/home/74225593",
    });
  });
});
