const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore, FieldValue } = require('@google-cloud/firestore');

const RESUME_DOWNLOADS_CACHE_MS = 15 * 60 * 1000;
const RESUME_DOWNLOADS_QUERY = `
    SELECT COUNT(*) AS count
    FROM \`cloud-portfolio-509107.analytics.resume_downloads\`
    WHERE NOT is_bot
`;

function createApp(firestore = new Firestore(), bigquery = new BigQuery()) {
    const app = express();
    app.set('trust proxy', 1);
    app.use(cors());
    app.use(express.json());
    let cachedResumeDownloads;

    const visitorCountLimiter = rateLimit({
        windowMs: 60_000,
        limit: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many requests' }
    });

    app.get('/api/visitor-count', visitorCountLimiter, async (req, res) => {
        try {
            const docRef = firestore.collection('visitors').doc('count');

            await docRef.set({
                count: FieldValue.increment(1)
            }, { merge: true });

            const doc = await docRef.get();
            const currentCount = doc.data().count;

            res.status(200).json({ count: currentCount });
        } catch (error) {
            console.error('Error updating visitor count:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    app.get('/api/resume-downloads', visitorCountLimiter, async (req, res) => {
        try {
            const now = Date.now();
            if (cachedResumeDownloads && cachedResumeDownloads.expiresAt > now) {
                res.set('Cache-Control', 'public, max-age=900');
                return res.status(200).json({ count: cachedResumeDownloads.count });
            }

            const [rows] = await bigquery.query({
                query: RESUME_DOWNLOADS_QUERY,
                useLegacySql: false
            });
            const count = Number(rows[0]?.count);
            if (!Number.isSafeInteger(count) || count < 0) {
                throw new Error('BigQuery returned an invalid resume download count');
            }

            cachedResumeDownloads = {
                count,
                expiresAt: now + RESUME_DOWNLOADS_CACHE_MS
            };
            res.set('Cache-Control', 'public, max-age=900');
            res.status(200).json({ count });
        } catch (error) {
            console.error('Error querying resume downloads:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });

    return app;
}

if (require.main === module) {
    const app = createApp();
    const port = process.env.PORT || 8080;
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}

module.exports = { createApp };