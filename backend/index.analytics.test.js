const assert = require("node:assert/strict");
const { once } = require("node:events");
const { test } = require("node:test");
const { createApp } = require("./index");

async function startApp(bigquery, oauthClient, analyticsConfig) {
  const app = createApp({}, bigquery, oauthClient, analyticsConfig);
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}/api/resume-downloads`,
    analyticsUrl: `http://127.0.0.1:${port}/api/admin/analytics`,
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

test("resume download endpoint returns and caches the non-bot count", async () => {
  let queryCount = 0;
  let queryOptions;
  const service = await startApp({
    query: async (options) => {
      queryCount += 1;
      queryOptions = options;
      return [[{ count: "42" }]];
    },
  });

  test("private analytics requires the allowlisted verified Google account", async () => {
    let queryCount = 0;
    let queryOptions;
    const service = await startApp(
      {
        query: async (options) => {
          queryCount += 1;
          queryOptions = options;
          return [[{
            report: "summary",
            dimension: "page_views",
            label: "Page views",
            day: "",
            event_count: "12",
            visitor_count: "8",
            bot_count: "2",
          }]];
        },
      },
      {
        verifyIdToken: async ({ idToken, audience }) => {
          assert.equal(idToken, "valid-token");
          assert.equal(audience, "test-client-id");
          return {
            getPayload: () => ({
              email: "racell.sincioco@gmail.com",
              email_verified: true,
            }),
          };
        },
      },
      {
        googleClientId: "test-client-id",
        adminEmail: "racell.sincioco@gmail.com",
      },
    );

    try {
      const unauthorized = await fetch(
        `${service.analyticsUrl}?startDate=2026-10-01&endDate=2026-10-16`,
      );
      assert.equal(unauthorized.status, 401);
      assert.equal(queryCount, 0);

      const response = await fetch(
        `${service.analyticsUrl}?startDate=2026-10-01&endDate=2026-10-16`,
        { headers: { Authorization: "Bearer valid-token" } },
      );
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.deepEqual(await response.json(), {
        rows: [{
          report: "summary",
          dimension: "page_views",
          label: "Page views",
          day: null,
          eventCount: 12,
          visitorCount: 8,
          botCount: 2,
        }],
      });
      assert.deepEqual(queryOptions.params, {
        start_date: "2026-10-01",
        end_date: "2026-10-16",
      });
      assert.deepEqual(queryOptions.types, {
        start_date: "DATE",
        end_date: "DATE",
      });
      assert.match(queryOptions.query, /analytics\.security_probes/);
      assert.equal(queryCount, 1);
    } finally {
      await service.close();
    }
  });

  test("private analytics rejects other Google accounts and invalid date ranges", async () => {
    let queryCount = 0;
    let email = "other@example.com";
    const service = await startApp(
      {
        query: async () => {
          queryCount += 1;
          return [[]];
        },
      },
      {
        verifyIdToken: async () => ({
          getPayload: () => ({
            email,
            email_verified: true,
          }),
        }),
      },
      {
        googleClientId: "test-client-id",
        adminEmail: "racell.sincioco@gmail.com",
      },
    );

    try {
      const headers = { Authorization: "Bearer valid-token" };
      const denied = await fetch(
        `${service.analyticsUrl}?startDate=2026-10-01&endDate=2026-10-16`,
        { headers },
      );
      assert.equal(denied.status, 403);

      email = "racell.sincioco@gmail.com";
      const invalidDate = await fetch(
        `${service.analyticsUrl}?startDate=2026-02-30&endDate=2026-10-16`,
        { headers },
      );
      assert.equal(invalidDate.status, 400);

      const tooWide = await fetch(
        `${service.analyticsUrl}?startDate=2026-01-01&endDate=2026-04-01`,
        { headers },
      );
      assert.equal(tooWide.status, 400);
      assert.equal(queryCount, 0);
    } finally {
      await service.close();
    }
  });

  test("private analytics is unavailable until OAuth configuration is supplied", async () => {
    let queryCount = 0;
    const service = await startApp(
      {
        query: async () => {
          queryCount += 1;
          return [[]];
        },
      },
      { verifyIdToken: async () => { throw new Error("Should not verify without configuration"); } },
      { googleClientId: "", adminEmail: "racell.sincioco@gmail.com" },
    );

    try {
      const response = await fetch(
        `${service.analyticsUrl}?startDate=2026-10-01&endDate=2026-10-16`,
      );
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        error: "Analytics authorization is not configured",
      });
      assert.equal(queryCount, 0);
    } finally {
      await service.close();
    }
  });

  try {
    const first = await fetch(service.url);
    assert.equal(first.status, 200);
    assert.equal(first.headers.get("cache-control"), "public, max-age=900");
    assert.deepEqual(await first.json(), { count: 42 });

    const second = await fetch(service.url);
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), { count: 42 });
    assert.equal(queryCount, 1);
    assert.match(queryOptions.query, /analytics\.resume_downloads/);
    assert.match(queryOptions.query, /WHERE NOT is_bot/);
  } finally {
    await service.close();
  }
});

test("resume download endpoint reports query failures", async () => {
  const service = await startApp({
    query: async () => {
      throw new Error("BigQuery unavailable");
    },
  });
  const originalError = console.error;
  console.error = () => {};

  try {
    const response = await fetch(service.url);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Internal Server Error" });
  } finally {
    console.error = originalError;
    await service.close();
  }
});

test("resume download endpoint rejects invalid BigQuery results", async () => {
  const service = await startApp({
    query: async () => [[{ count: "not-a-count" }]],
  });
  const originalError = console.error;
  console.error = () => {};

  try {
    const response = await fetch(service.url);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Internal Server Error" });
  } finally {
    console.error = originalError;
    await service.close();
  }
});
