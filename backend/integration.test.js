const assert = require('node:assert/strict');
const { test, describe, after } = require('node:test');
const { createApp } = require('./index');

describe('Visitor API Integration Tests (Sprint 6)', () => {
    // We do NOT mock Firestore here. createApp() will initialize the real Google Cloud SDK.
    const app = createApp();
    const server = app.listen(0);
    const { port } = server.address();
    const baseUrl = `http://127.0.0.1:${port}`;

    after(() => {
        server.close();
        server.closeAllConnections();
    });

    test('TEST-04: API successfully authenticates and updates the real Firestore database', async () => {
        const response = await fetch(`${baseUrl}/api/visitor-count`);
        const data = await response.json();
        
        assert.equal(response.status, 200, `Expected 200 OK but received ${response.status}. (Are your GCP credentials active?)`);
        assert.equal(typeof data.count, 'number', 'The database did not return a valid number.');
        assert.ok(data.count > 0, 'The visitor count should be greater than 0.');
    });
});