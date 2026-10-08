const assert = require("node:assert/strict");
const { test, describe, after } = require("node:test");
const { createApp } = require("./index");

describe("Visitor API Unit Tests (Sprint 6)", () => {
  // 1. Mock Firestore to prevent live database connections during tests
  let writes = 0;
  const mockFirestore = {
    collection: () => ({
      doc: () => ({
        set: async () => {
          writes += 1;
        },
        get: async () => ({
          data: () => ({ count: writes }),
        }),
      }),
    }),
  };

  // 2. Initialize the Express app with the mocked database on a random port
  const app = createApp(mockFirestore);
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  after(() => {
    server.close();
    server.closeAllConnections();
  });

  test("TEST-01: Counter increment function correctly returns updated count", async () => {
    const response = await fetch(`${baseUrl}/api/visitor-count`);
    const data = await response.json();

    assert.equal(response.status, 200);
    assert.equal(typeof data.count, "number");
    assert.ok(data.count > 0);
  });

  test("TEST-02: API rejects requests after exceeding rate limit (HTTP 429)", async () => {
    const statuses = [];

    // Fire 21 requests from a simulated IP. Limit is 20 per minute.
    for (let i = 0; i < 21; i++) {
      const res = await fetch(`${baseUrl}/api/visitor-count`, {
        headers: { "x-forwarded-for": "198.51.100.1" },
      });
      statuses.push(res.status);
    }

    // The first 20 should pass (200 OK), the 21st must fail (429 Too Many Requests)
    const expectedStatuses = [...Array(20).fill(200), 429];
    assert.deepEqual(statuses, expectedStatuses);
  });

  test("TEST-02b: API rejects unsupported HTTP verbs", async () => {
    const response = await fetch(`${baseUrl}/api/visitor-count`, {
      method: "POST",
    });

    // Express defaults unmapped methods on a route to 404 Not Found
    assert.equal(response.status, 404);
  });

  test("TEST-03: API correctly attaches CORS headers", async () => {
    const response = await fetch(`${baseUrl}/api/visitor-count`, {
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
