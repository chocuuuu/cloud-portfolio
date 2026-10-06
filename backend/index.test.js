const assert = require('node:assert/strict');
const test = require('node:test');
const { createApp } = require('./index');

test('limits visitor-count updates to 20 requests per client per minute', async (t) => {
    let writes = 0;
    const firestore = {
        collection: () => ({
            doc: () => ({
                set: async () => {
                    writes += 1;
                },
                get: async () => ({
                    data: () => ({ count: writes })
                })
            })
        })
    };
    const server = createApp(firestore).listen(0);
    t.after(() => new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections();
    }));

    const { port } = server.address();
    const statuses = [];
    for (let request = 0; request < 21; request += 1) {
        const response = await fetch(`http://127.0.0.1:${port}/api/visitor-count`, {
            headers: {
                'connection': 'close',
                'x-forwarded-for': '198.51.100.7'
            }
        });
        statuses.push(response.status);
    }

    assert.deepEqual(statuses, [...Array(20).fill(200), 429]);

    const otherClientResponse = await fetch(`http://127.0.0.1:${port}/api/visitor-count`, {
        headers: {
            connection: 'close',
            'x-forwarded-for': '198.51.100.8'
        }
    });

    assert.equal(otherClientResponse.status, 200);
    assert.equal(writes, 21);
});
