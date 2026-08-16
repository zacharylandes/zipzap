import { describe, expect, it } from "vitest";
import { mercadoLibreHtmlLooksBlocked } from "@/search/adapters/mercadolibre-fetch";

describe("mercadoLibreHtmlLooksBlocked", () => {
  it("detects bot-wall HTML", () => {
    expect(
      mercadoLibreHtmlLooksBlocked(
        '<html><body><div class="account-verification-main"></div></body></html>',
      ),
    ).toBe(true);
  });

  it("accepts pages with listing cards", () => {
    const cards = "<li class=\"ui-search-layout__item\"></li>".repeat(40);
    expect(
      mercadoLibreHtmlLooksBlocked(`<html>${"x".repeat(25_000)}${cards}</html>`),
    ).toBe(false);
  });
});
