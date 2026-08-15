import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadFirecrawlKeys, redactSecrets } from "@/firecrawl/keys";

const tempFiles: string[] = [];

afterEach(() => {
  for (const file of tempFiles.splice(0)) {
    fs.rmSync(file, { force: true });
  }
});

describe("loadFirecrawlKeys", () => {
  it("loads and dedupes env + keys.md", () => {
    const file = path.join(os.tmpdir(), `hs-keys-${Date.now()}.md`);
    tempFiles.push(file);
    fs.writeFileSync(
      file,
      "fc-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\nfc-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\nfc-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n",
    );

    const keys = loadFirecrawlKeys(file, {
      FIRECRAWL_API_KEY: "fc-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    } as NodeJS.ProcessEnv);

    expect(keys).toEqual([
      "fc-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      "fc-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ]);
  });

  it("redacts key values", () => {
    const key = "fc-cccccccccccccccccccccccccccccccc";
    expect(redactSecrets(`failed with ${key}`, [key])).toContain("[REDACTED_KEY]");
    expect(redactSecrets(`failed with ${key}`, [key])).not.toContain(key);
  });
});
