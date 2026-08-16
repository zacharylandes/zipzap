import { test, expect } from "@playwright/test";

test("investor scan shows ranked markets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Highest rent for the price" })).toBeVisible();
  await expect(page.getByLabel("Crime filter")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Yield" })).toBeVisible({ timeout: 15_000 });
});

test("country dropdown switches to live listings search", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Country").selectOption("MX");
  await expect(page.getByRole("heading", { name: "Homes for sale in Mexico" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Search listings" })).toBeVisible();
  await expect(page.getByLabel("Crime filter")).toHaveCount(0);

  await page.getByLabel("City").selectOption("ciudad-de-mexico");

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/search") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Search listings" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  await expect(page.getByText("Sunny 2-bed apartment near the park")).toBeVisible();
  await expect(page.getByLabel("Source status")).toBeVisible();
});

test("is responsive at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Highest rent for the price" })).toBeVisible();
  await expect(page.getByLabel("Country")).toBeVisible();
});

test("view photos opens a zip page you can go back from", async ({ page }) => {
  await page.goto("/");
  const photos = page.getByRole("link", { name: "View photos" }).first();
  await expect(photos).toBeVisible({ timeout: 15_000 });
  await photos.click();
  await expect(page).toHaveURL(/\/zips\/\d{5}/);
  await expect(page.getByRole("heading", { name: /homes for sale in/i })).toBeVisible();
  await page.getByRole("link", { name: "Back to ZIP list" }).click();
  await expect(page).toHaveURL(/\/(\?|$)/);
  await expect(page.getByRole("columnheader", { name: "Yield" })).toBeVisible();
});
