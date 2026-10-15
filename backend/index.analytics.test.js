const assert = require("node:assert/strict");
const { once } = require("node:events");
const { test } = require("node:test");
const { createApp } = require("./index");

async function startApp(bigquery) {
  const app = createApp({}, bigquery);
  const server = app.listen(0);
  await once(server, "listening");
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}/api/resume-downloads`,
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
