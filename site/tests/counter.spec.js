import { test, expect } from "@playwright/test";

test("TEST-05: Visitor counter successfully fetches and renders live database integer", async ({
  page,
}) => {
  // 1. Navigate to the correct live production site
  await page.goto("https://cloud-portfolio-509107.web.app/");

  // 2. Locate the actual visitor counter element by its correct DOM ID
  const counter = page.locator("#views-count");

  // 3. Playwright Best Practice: Auto-retry until the element contains at least one digit
  await expect(counter).toHaveText(/[0-9]+/, { timeout: 10000 });

  // 4. Extract the resolved text
  const countText = await counter.innerText();

  // 5. Clean the string (remove commas if any) and parse to an integer
  const countNumber = parseInt(countText.replace(/,/g, ""), 10);

  // 6. Assert that the frontend successfully parsed a valid number greater than 0
  expect(countNumber).toBeGreaterThan(0);
});
