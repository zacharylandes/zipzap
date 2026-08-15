import { Firecrawl } from "firecrawl";
import { z } from "zod";
import { loadFirecrawlKeys } from "../src/firecrawl/keys";

async function probe(url: string) {
  const keys = loadFirecrawlKeys();
  const client = new Firecrawl({ apiKey: keys[0] });
  const schema = z.toJSONSchema(
    z.object({
      listings: z.array(
        z.object({
          title: z.string(),
          price: z.number().nullable().optional(),
          url: z.string(),
        }),
      ),
    }),
  );

  const result = await client.scrape(url, {
    formats: [
      {
        type: "json",
        schema,
        prompt: "Extract up to 5 housing listings with title, price, url.",
      },
      "markdown",
    ],
    onlyMainContent: true,
    waitFor: 4000,
    proxy: "auto",
  });

  return {
    url,
    jsonCount: Array.isArray((result.json as { listings?: unknown[] })?.listings)
      ? (result.json as { listings: unknown[] }).listings.length
      : 0,
    markdownLen: (result.markdown || "").length,
    sample: (result.markdown || "").slice(0, 400),
    metadata: result.metadata,
  };
}

async function main() {
  const urls = [
    "https://www.idealista.com/alquiler-viviendas/madrid/",
    "https://www.immobiliare.it/affitto-case/milano/",
  ];
  for (const url of urls) {
    try {
      console.log(JSON.stringify(await probe(url), null, 2));
    } catch (error) {
      console.log(
        JSON.stringify({
          url,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
}

main();
