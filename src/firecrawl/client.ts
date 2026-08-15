import { Firecrawl } from "firecrawl";
import { loadFirecrawlKeys, redactSecrets } from "@/firecrawl/keys";

export type FirecrawlHttpError = {
  status?: number;
  message: string;
  retryAfterMs?: number;
};

export type KeyHealth = {
  keyFingerprint: string;
  disabled: boolean;
  reason?: string;
};

type ScrapeFn = (
  url: string,
  options: Record<string, unknown>,
) => Promise<unknown>;

export type FirecrawlClientOptions = {
  keys?: string[];
  createClient?: (apiKey: string) => { scrape: ScrapeFn };
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

function fingerprint(key: string): string {
  return `fc-…${key.slice(-4)}`;
}

function parseStatus(error: unknown): FirecrawlHttpError {
  const anyErr = error as {
    status?: number;
    statusCode?: number;
    response?: { status?: number; headers?: Record<string, string> };
    message?: string;
    headers?: Record<string, string>;
  };

  const status =
    anyErr?.status ?? anyErr?.statusCode ?? anyErr?.response?.status;

  const message =
    typeof anyErr?.message === "string" ? anyErr.message : String(error);

  const headers = anyErr?.headers ?? anyErr?.response?.headers;
  const retryAfter = headers?.["retry-after"] ?? headers?.["Retry-After"];
  let retryAfterMs: number | undefined;
  if (retryAfter) {
    const asNumber = Number(retryAfter);
    if (!Number.isNaN(asNumber)) {
      retryAfterMs = asNumber * 1000;
    } else {
      const dateMs = Date.parse(retryAfter);
      if (!Number.isNaN(dateMs)) {
        retryAfterMs = Math.max(0, dateMs - Date.now());
      }
    }
  }

  return { status, message, retryAfterMs };
}

const NETWORK_ERROR_PATTERN =
  /socket hang up|ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|network|fetch failed|terminated|aborted/i;

function isTransientNetworkError(parsed: FirecrawlHttpError): boolean {
  return parsed.status == null && NETWORK_ERROR_PATTERN.test(parsed.message);
}

function defaultCreateClient(apiKey: string) {
  const client = new Firecrawl({ apiKey });
  return {
    scrape: (url: string, options: Record<string, unknown>) =>
      client.scrape(url, options as never),
  };
}

async function defaultSleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class FirecrawlClient {
  private readonly keys: string[];
  private readonly createClient: NonNullable<
    FirecrawlClientOptions["createClient"]
  >;
  private readonly sleep: NonNullable<FirecrawlClientOptions["sleep"]>;
  private readonly now: () => number;
  private readonly health = new Map<string, KeyHealth>();
  private cursor = 0;

  constructor(options: FirecrawlClientOptions = {}) {
    this.keys = options.keys ?? loadFirecrawlKeys();
    this.createClient = options.createClient ?? defaultCreateClient;
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? Date.now;
    for (const key of this.keys) {
      this.health.set(key, {
        keyFingerprint: fingerprint(key),
        disabled: false,
      });
    }
  }

  getKeyCount(): number {
    return this.keys.length;
  }

  getHealth(): KeyHealth[] {
    return this.keys.map(
      (key) =>
        this.health.get(key) ?? {
          keyFingerprint: fingerprint(key),
          disabled: false,
        },
    );
  }

  private activeKeys(): string[] {
    return this.keys.filter((key) => !this.health.get(key)?.disabled);
  }

  private disable(key: string, reason: string) {
    this.health.set(key, {
      keyFingerprint: fingerprint(key),
      disabled: true,
      reason,
    });
  }

  private sanitizeError(error: unknown): string {
    return redactSecrets(
      error instanceof Error ? error.message : String(error),
      this.keys,
    );
  }

  private raceTimeout<T>(promise: Promise<T>, remainingMs: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Firecrawl scrape timed out")),
          Math.max(1, remainingMs),
        );
      }),
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  async scrape(url: string, options: Record<string, unknown> = {}): Promise<unknown> {
    if (this.keys.length === 0) {
      throw new Error("No Firecrawl API keys available");
    }

    let lastError: Error | null = null;
    const maxAttempts = this.keys.length * 2;
    const timeoutMs =
      typeof options.timeout === "number" && options.timeout > 0
        ? options.timeout
        : undefined;
    const started = this.now();

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (timeoutMs != null && this.now() - started >= timeoutMs) {
        throw lastError ?? new Error("Firecrawl scrape timed out");
      }

      const active = this.activeKeys();
      if (active.length === 0) {
        throw new Error(
          lastError?.message ?? "All Firecrawl API keys are unhealthy",
        );
      }

      const key = active[this.cursor % active.length]!;
      this.cursor = (this.cursor + 1) % Math.max(active.length, 1);

      try {
        const client = this.createClient(key);
        const scrapePromise = client.scrape(url, options);
        if (timeoutMs == null) return await scrapePromise;
        return await this.raceTimeout(
          scrapePromise,
          timeoutMs - (this.now() - started),
        );
      } catch (error) {
        const parsed = parseStatus(error);
        const safeMessage = this.sanitizeError(error);
        lastError = new Error(safeMessage);

        if (parsed.status === 401) {
          this.disable(key, "invalid_or_revoked");
          continue;
        }

        if (parsed.status === 402) {
          this.disable(key, "credits_exhausted");
          continue;
        }

        if (parsed.status === 403) {
          // Permissions/plan issue: do not assume other keys help.
          throw new Error(`Firecrawl forbidden: ${safeMessage}`);
        }

        // Timeouts must fail the user request instead of starting another
        // 1–2 minute scrape against the next key.
        if (parsed.status === 408 || /timed out/i.test(parsed.message)) {
          throw lastError;
        }

        if (
          parsed.status === 429 ||
          (parsed.status != null && parsed.status >= 500) ||
          isTransientNetworkError(parsed)
        ) {
          const waitMs = Math.min(
            parsed.retryAfterMs ?? 1000 * Math.min(attempt + 1, 5),
            15_000,
          );
          await this.sleep(waitMs);
          continue;
        }

        // Extraction/schema/content or unknown client errors: do not rotate.
        throw lastError;
      }
    }

    throw lastError ?? new Error("Firecrawl request failed");
  }
}

let singleton: FirecrawlClient | null = null;

export function getFirecrawlClient(): FirecrawlClient {
  if (!singleton) {
    singleton = new FirecrawlClient();
  }
  return singleton;
}

export function resetFirecrawlClientForTests() {
  singleton = null;
}
