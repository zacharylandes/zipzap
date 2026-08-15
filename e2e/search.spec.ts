import { test, expect } from "@playwright/test";

test("investor scan shows ranked markets", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Highest rent for the price" })).toBeVisible();
  await expect(page.getByLabel("Crime filter")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Yield" })).toBeVisible({ timeout: 15_000 });
});

test("browse listings search flow shows mocked listings", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Browse listings" }).click();
  await expect(page.getByRole("heading", { name: "Find homes across borders" })).toBeVisible();

  await page.getByRole("combobox", { name: "Country" }).selectOption("US");
  await page.getByRole("textbox", { name: "City or region" }).fill("Austin, TX");
  await page.getByRole("button", { name: "Sale", pressed: false }).click();

  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/api/search") && response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Search listings" }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  await expect(page.getByText("Sunny 2-bed apartment near the park")).toBeVisible();
  await expect(page.getByText("Bright loft with balcony")).toBeVisible();
  await expect(page.getByLabel("Source status")).toBeVisible();
});

test("is responsive at mobile width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Highest rent for the price" })).toBeVisible();
  await expect(page.getByLabel("Search mode")).toBeVisible();
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
