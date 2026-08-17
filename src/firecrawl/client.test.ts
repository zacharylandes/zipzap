import { describe, expect, it, vi } from "vitest";
import { FirecrawlClient } from "@/firecrawl/client";

const KEY_A = "fc-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const KEY_B = "fc-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

describe("FirecrawlClient retry policy", () => {
  it("disables a key on 401 and uses the next key", async () => {
    const scrape = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("unauthorized"), { status: 401 }))
      .mockResolvedValueOnce({ ok: true });

    const client = new FirecrawlClient({
      keys: [KEY_A, KEY_B],
      createClient: () => ({ scrape }),
      sleep: async () => undefined,
    });

    const result = await client.scrape("https://example.com", {});
    expect(result).toEqual({ ok: true });
    expect(client.getHealth().find((h) => h.keyFingerprint.endsWith("aaaa"))?.disabled).toBe(
      true,
    );
  });

  it("rotates on 402 credit exhaustion", async () => {
    const scrape = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("payment required"), { status: 402 }))
      .mockResolvedValueOnce({ ok: true });

    const client = new FirecrawlClient({
      keys: [KEY_A, KEY_B],
      createClient: () => ({ scrape }),
      sleep: async () => undefined,
    });

    await client.scrape("https://example.com", {});
    expect(scrape).toHaveBeenCalledTimes(2);
  });

  it("rotates when a credits error has no status code", async () => {
    const scrape = vi
      .fn()
      .mockRejectedValueOnce(
        new Error(
          "Insufficient credits to perform this request. For more credits, you can upgrade your plan at https://firecrawl.dev/pricing",
        ),
      )
      .mockResolvedValueOnce({ ok: true });

    const client = new FirecrawlClient({
      keys: [KEY_A, KEY_B],
      createClient: () => ({ scrape }),
      sleep: async () => undefined,
    });

    await expect(client.scrape("https://example.com", {})).resolves.toEqual({ ok: true });
    expect(scrape).toHaveBeenCalledTimes(2);
  });

  it("retries remaining keys on a later scrape after every key returned 402", async () => {
    const scrape = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("payment required"), { status: 402 }))
      .mockRejectedValueOnce(Object.assign(new Error("payment required"), { status: 402 }))
      .mockRejectedValueOnce(Object.assign(new Error("payment required"), { status: 402 }))
      .mockResolvedValueOnce({ ok: true });

    const client = new FirecrawlClient({
      keys: [KEY_A, KEY_B],
      createClient: () => ({ scrape }),
      sleep: async () => undefined,
    });

    await expect(client.scrape("https://example.com", {})).rejects.toThrow(/payment required|unhealthy/i);
    await expect(client.scrape("https://example.com", {})).resolves.toEqual({ ok: true });
    expect(scrape).toHaveBeenCalledTimes(4);
  });

  it("honors Retry-After on 429 before continuing", async () => {
    const sleep = vi.fn(async () => undefined);
    const scrape = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error("rate limited"), {
          status: 429,
          headers: { "retry-after": "2" },
        }),
      )
      .mockResolvedValueOnce({ ok: true });

    const client = new FirecrawlClient({
      keys: [KEY_A, KEY_B],
      createClient: () => ({ scrape }),
      sleep,
    });

    await client.scrape("https://example.com", {});
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("retries transient network errors like socket hang up", async () => {
    const scrape = vi
      .fn()
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce({ ok: true });

    const client = new FirecrawlClient({
      keys: [KEY_A, KEY_B],
      createClient: () => ({ scrape }),
      sleep: async () => undefined,
    });

    const result = await client.scrape("https://example.com", {});
    expect(result).toEqual({ ok: true });
    expect(scrape).toHaveBeenCalledTimes(2);
    // Network error must not disable the key.
    expect(client.getHealth().every((h) => !h.disabled)).toBe(true);
  });

  it("does not rotate keys on extraction/content errors", async () => {
    const scrape = vi.fn().mockRejectedValue(new Error("schema mismatch"));
    const client = new FirecrawlClient({
      keys: [KEY_A, KEY_B],
      createClient: () => ({ scrape }),
      sleep: async () => undefined,
    });

    await expect(client.scrape("https://example.com", {})).rejects.toThrow(
      "schema mismatch",
    );
    expect(scrape).toHaveBeenCalledTimes(1);
  });

  it("does not retry a timed-out scrape", async () => {
    const scrape = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("timeout"), { status: 408 }));
    const client = new FirecrawlClient({
      keys: [KEY_A, KEY_B],
      createClient: () => ({ scrape }),
      sleep: async () => undefined,
    });

    await expect(client.scrape("https://example.com", { timeout: 1000 })).rejects.toThrow(
      "timeout",
    );
    expect(scrape).toHaveBeenCalledTimes(1);
  });

  it("abandons a hung scrape when the timeout budget elapses", async () => {
    vi.useFakeTimers();
    const scrape = vi.fn(() => new Promise(() => {}));
    const client = new FirecrawlClient({
      keys: [KEY_A, KEY_B],
      createClient: () => ({ scrape }),
      sleep: async () => undefined,
    });

    const pending = client.scrape("https://example.com", { timeout: 1000 });
    let settled = false;
    void pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    await vi.advanceTimersByTimeAsync(2000);
    expect(settled).toBe(true);
    await expect(pending).rejects.toThrow(/timed out/i);
    expect(scrape).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
