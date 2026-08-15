import "server-only";
import os from "node:os";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "playwright";
import type { SearchInput } from "@/search/schema";

/**
 * Local-only Facebook Marketplace access.
 *
 * Firecrawl's cloud browser triggers infinite Facebook CAPTCHA loops (datacenter
 * IP), and Chrome 136+ blocks CDP against the real default profile. So we drive
 * the user's installed Chrome (`channel: "chrome"`) with a dedicated persistent
 * profile on their machine/home IP. They log in once; the session persists.
 *
 * launchPersistentContext holds an exclusive lock on the profile dir, so only
 * one context (login OR search) can be open at a time.
 */

export const FB_PROFILE_DIR =
  process.env.HOUSE_SEARCH_FB_PROFILE_DIR ||
  path.join(os.homedir(), ".house-search", "fb-profile");

const CHROME_CHANNEL = process.env.HOUSE_SEARCH_FB_CHROME_CHANNEL || "chrome";
const FB_HOME = "https://www.facebook.com/";

type LaunchOptions = { headless: boolean };

async function launchContext({ headless }: LaunchOptions): Promise<BrowserContext> {
  return chromium.launchPersistentContext(FB_PROFILE_DIR, {
    channel: CHROME_CHANNEL,
    headless,
    viewport: { width: 1280, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

async function isLoggedIn(context: BrowserContext): Promise<boolean> {
  const cookies = await context.cookies("https://www.facebook.com");
  return cookies.some((c) => c.name === "c_user");
}

// A headed login window kept alive between "open" and "finish".
let activeLogin: { context: BrowserContext; page: Page } | null = null;

// Serializes profile-dir access (the dir lock would otherwise throw).
let lock: Promise<void> | null = null;
async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  while (lock) await lock;
  let release!: () => void;
  lock = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    return await fn();
  } finally {
    release();
    lock = null;
  }
}

/** Open a visible Chrome window on the Facebook login page and keep it alive. */
export async function openFacebookLogin(): Promise<{ message: string }> {
  if (activeLogin) {
    await activeLogin.page.bringToFront().catch(() => undefined);
    return { message: "Login window already open — sign in, then click \u201cI\u2019m signed in\u201d." };
  }

  return withLock(async () => {
    const context = await launchContext({ headless: false });
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(FB_HOME, { waitUntil: "domcontentloaded", timeout: 60_000 });
    activeLogin = { context, page };
    return {
      message: "Sign in to Facebook in the window that opened, then click \u201cI\u2019m signed in\u201d.",
    };
  });
}

/** Close the login window so the persistent profile keeps the session. */
export async function finishFacebookLogin(): Promise<{
  connected: boolean;
  message: string;
}> {
  if (!activeLogin) {
    return { connected: await checkFacebookStatus().then((s) => s.connected), message: "No login window is open." };
  }
  const { context } = activeLogin;
  const connected = await isLoggedIn(context);
  await context.close().catch(() => undefined);
  activeLogin = null;
  return connected
    ? { connected: true, message: "Facebook session saved." }
    : { connected: false, message: "Didn't detect a signed-in session. Try again." };
}

export async function checkFacebookStatus(): Promise<{
  connected: boolean;
  message: string;
}> {
  if (activeLogin) {
    const connected = await isLoggedIn(activeLogin.context);
    return {
      connected,
      message: connected
        ? "Signed in — click \u201cI\u2019m signed in\u201d to save."
        : "Login window open — waiting for sign in.",
    };
  }

  return withLock(async () => {
    let context: BrowserContext | null = null;
    try {
      context = await launchContext({ headless: true });
      const connected = await isLoggedIn(context);
      return connected
        ? { connected: true, message: "Facebook profile is authenticated." }
        : { connected: false, message: "Not connected — sign in to enable Marketplace." };
    } catch (error) {
      return {
        connected: false,
        message: error instanceof Error ? error.message : "Unable to check Facebook status.",
      };
    } finally {
      await context?.close().catch(() => undefined);
    }
  });
}

export type FacebookRawListing = { url: string; text: string; img: string | null };
export type FacebookScrapeResult = { loggedIn: boolean; listings: FacebookRawListing[] };

export function buildMarketplaceUrl(input: SearchInput): string {
  const kind = input.listingType === "rent" ? "apartment for rent" : "house for sale";
  const query = encodeURIComponent(`${kind} ${input.location}`.trim());
  return `https://www.facebook.com/marketplace/search/?query=${query}&exact=false`;
}

export async function scrapeFacebookMarketplace(
  input: SearchInput,
): Promise<FacebookScrapeResult> {
  if (activeLogin) {
    throw new Error("Finish the Facebook login before searching.");
  }

  return withLock(async () => {
    const headless = process.env.HOUSE_SEARCH_FB_HEADFUL !== "1";
    let context: BrowserContext | null = null;
    try {
      context = await launchContext({ headless });
      const page = context.pages()[0] ?? (await context.newPage());
      await page.goto(buildMarketplaceUrl(input), {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForTimeout(5_000);

      const loggedIn = await isLoggedIn(context);
      const listings = await page.$$eval(
        'a[href*="/marketplace/item/"]',
        (els) => {
          const seen = new Set<string>();
          const out: { url: string; text: string; img: string | null }[] = [];
          for (const a of els as HTMLAnchorElement[]) {
            const url = a.href.split("?")[0];
            if (seen.has(url)) continue;
            seen.add(url);
            const text = (a.innerText || "").replace(/\s*\n+\s*/g, " | ").trim();
            const img = a.querySelector("img");
            out.push({ url, text, img: img ? (img as HTMLImageElement).src : null });
            if (out.length >= 20) break;
          }
          return out;
        },
      );
      return { loggedIn, listings };
    } finally {
      await context?.close().catch(() => undefined);
    }
  });
}

// Test seam.
export function __resetActiveLoginForTests() {
  activeLogin = null;
}
