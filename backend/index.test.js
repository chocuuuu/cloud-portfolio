const assert = require("node:assert/strict");
const { test, describe } = require("node:test");

// We will run these tests against your local Express server
const BASE_URL = "http://localhost:8080";

describe("Visitor API Unit & Integration Tests (Sprint 6)", () => {
  test("TEST-01: Counter increment function correctly returns updated count", async () => {
    const response = await fetch(`${BASE_URL}/api/visitor-count`);
    const data = await response.json();

    assert.equal(
      response.status,
      200,
      `Expected 200 OK but got ${response.status}. (Is your backend running on 8080?)`,
    );
    assert.equal(
      typeof data.count,
      "number",
      "The database did not return a valid number.",
    );
    assert.ok(data.count > 0, "The visitor count should be greater than 0.");
  });

  test("TEST-02: API rejects requests after exceeding rate limit (HTTP 429)", async () => {
    const statuses = [];

    // Fire 21 requests from a simulated IP. The Express limit is typically 20 per minute.
    for (let i = 0; i < 21; i++) {
      const res = await fetch(`${BASE_URL}/api/visitor-count`, {
        headers: { "x-forwarded-for": "198.51.100.1" },
      });
      statuses.push(res.status);
    }

    // The 21st request must fail with 429 Too Many Requests
    assert.equal(
      statuses[20],
      429,
      "Rate limit was not enforced at 20 requests.",
    );
  });

  test("TEST-03: API correctly attaches CORS headers", async () => {
    const response = await fetch(`${BASE_URL}/api/visitor-count`, {
      method: "OPTIONS", // Preflight request
      headers: {
        Origin: "http://localhost:4321",
        "Access-Control-Request-Method": "GET",
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
  });
});
