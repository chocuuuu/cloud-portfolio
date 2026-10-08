import { test, expect } from "@playwright/test";

test("TEST-05: Visitor counter successfully fetches and renders live database integer", async ({
  page,
}) => {
  // 1. Navigate to the live production site
  await page.goto("https://cloud-portfolio-509107.web.app/");

  // 2. Locate the visitor counter element in the DOM
  const counter = page.locator("#visitor-count");

  // 3. Wait for the initial "Loading..." state to resolve
  await expect(counter).not.toHaveText("Loading...", { timeout: 10000 });

  // 4. Extract the resolved text
  const countText = await counter.innerText();

  // 5. Clean the string (remove commas if any) and parse to an integer
  const countNumber = parseInt(countText.replace(/,/g, ""), 10);

  // 6. Assert that the frontend successfully parsed a valid number greater than 0
  expect(countNumber).toBeGreaterThan(0);
});
