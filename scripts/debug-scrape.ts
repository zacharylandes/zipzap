import { Firecrawl } from "firecrawl";
import { z } from "zod";
import { loadFirecrawlKeys } from "../src/firecrawl/keys";

async function main() {
  const keys = loadFirecrawlKeys();
  const client = new Firecrawl({ apiKey: keys[0] });
  const schema = z.object({
    listings: z
      .array(
        z.object({
          title: z.string().optional(),
          price: z.union([z.number(), z.string()]).optional(),
          url: z.string().optional(),
        }),
      )
      .default([]),
  });

  const url = "https://www.realtor.com/realestateandhomes-search/Austin_TX";
  const result = await client.scrape(url, {
    formats: [
      {
        type: "json",
        schema,
        prompt: "Extract up to 5 property listings with title, price, and url.",
      },
      "markdown",
    ],
    onlyMainContent: true,
    waitFor: 3000,
  });

  console.log(
    JSON.stringify(
      {
        keys: Object.keys(result || {}),
        jsonType: typeof result?.json,
        json: result?.json,
        markdownLen: (result?.markdown || "").length,
        markdownSample: (result?.markdown || "").slice(0, 800),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
