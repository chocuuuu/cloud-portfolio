const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { BigQuery } = require('@google-cloud/bigquery');
const { Firestore, FieldValue } = require('@google-cloud/firestore');
const { OAuth2Client } = require('google-auth-library');

const RESUME_DOWNLOADS_CACHE_MS = 15 * 60 * 1000;
const ANALYTICS_QUERY = `
    WITH page_views AS (
        SELECT
            day,
            COALESCE(source, '(direct)') AS referrer,
            COALESCE(user_agent, '') AS user_agent,
            is_bot,
            visitor_id,
            CASE
                WHEN REGEXP_CONTAINS(user_agent, r'Edg/') THEN 'Edge'
                WHEN REGEXP_CONTAINS(user_agent, r'Firefox/') THEN 'Firefox'
                WHEN REGEXP_CONTAINS(user_agent, r'Chrome/') THEN 'Chrome'
                WHEN REGEXP_CONTAINS(user_agent, r'Safari/') THEN 'Safari'
                ELSE 'Other'
            END AS browser
        FROM \`cloud-portfolio-509107.analytics.page_views\`
        WHERE day BETWEEN @start_date AND @end_date
    ),
    downloads AS (
        SELECT
            day,
            COALESCE(source, '(none)') AS source,
            COALESCE(user_agent, '') AS user_agent,
            is_bot,
            visitor_id
        FROM \`cloud-portfolio-509107.analytics.resume_downloads\`
        WHERE day BETWEEN @start_date AND @end_date
    ),
    probes AS (
        SELECT day, path
        FROM \`cloud-portfolio-509107.analytics.security_probes\`
        WHERE day BETWEEN @start_date AND @end_date
    ),
    reports AS (
        SELECT
            'summary' AS report,
            'page_views' AS dimension,
            'Page views' AS label,
            '' AS day,
            COUNTIF(NOT is_bot) AS event_count,
            COUNT(DISTINCT IF(NOT is_bot, visitor_id, NULL)) AS visitor_count,
            COUNTIF(is_bot) AS bot_count
        FROM page_views
        UNION ALL
        SELECT
            'summary', 'resume_downloads', 'Resume downloads', '',
            COUNTIF(NOT is_bot),
            COUNT(DISTINCT IF(NOT is_bot, visitor_id, NULL)),
            COUNTIF(is_bot)
        FROM downloads
        UNION ALL
        SELECT
            'summary', 'security_probes', '404 probes', '',
            COUNT(*), 0, 0
        FROM probes
        UNION ALL
        SELECT
            'daily', 'page_views', FORMAT_DATE('%F', day), FORMAT_DATE('%F', day),
            COUNTIF(NOT is_bot),
            COUNT(DISTINCT IF(NOT is_bot, visitor_id, NULL)),
            COUNTIF(is_bot)
        FROM page_views
        GROUP BY day
        UNION ALL
        SELECT
            'daily', 'resume_downloads', FORMAT_DATE('%F', day), FORMAT_DATE('%F', day),
            COUNTIF(NOT is_bot),
            COUNT(DISTINCT IF(NOT is_bot, visitor_id, NULL)),
            COUNTIF(is_bot)
        FROM downloads
        GROUP BY day
        UNION ALL
        SELECT
            'daily', 'security_probes', FORMAT_DATE('%F', day), FORMAT_DATE('%F', day),
            COUNT(*), 0, 0
        FROM probes
        GROUP BY day
        UNION ALL
        SELECT
            'breakdown', 'browser', browser, '',
            COUNTIF(NOT is_bot),
            COUNT(DISTINCT IF(NOT is_bot, visitor_id, NULL)),
            COUNTIF(is_bot)
        FROM page_views
        GROUP BY browser
        UNION ALL
        SELECT
            'breakdown', 'referrer', referrer, '',
            COUNTIF(NOT is_bot),
            COUNT(DISTINCT IF(NOT is_bot, visitor_id, NULL)),
            COUNTIF(is_bot)
        FROM page_views
        GROUP BY referrer
        UNION ALL
        SELECT
            'breakdown', 'resume_source', source, '',
            COUNTIF(NOT is_bot),
            COUNT(DISTINCT IF(NOT is_bot, visitor_id, NULL)),
            COUNTIF(is_bot)
        FROM downloads
        GROUP BY source
        UNION ALL
        SELECT
            'breakdown', 'probe_path', path, '',
            event_count, 0, 0
        FROM (
            SELECT path, COUNT(*) AS event_count
            FROM probes
            GROUP BY path
            ORDER BY event_count DESC
            LIMIT 50
        )
    )
    SELECT * FROM reports
`;
const RESUME_DOWNLOADS_QUERY = `
    SELECT COUNT(*) AS count
    FROM \`cloud-portfolio-509107.analytics.resume_downloads\`
    WHERE NOT is_bot
`;

function createApp(
    firestore = new Firestore(),
    bigquery = new BigQuery(),
    oauthClient = new OAuth2Client(),
    analyticsConfig = {
        googleClientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
        adminEmail: process.env.ANALYTICS_ADMIN_EMAIL
    }
) {
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

    app.get('/api/admin/analytics', visitorCountLimiter, async (req, res) => {
        const googleClientId = analyticsConfig.googleClientId?.trim();
        const adminEmail = analyticsConfig.adminEmail?.trim().toLowerCase();
        if (!googleClientId || !adminEmail) {
            return res.status(503).json({ error: 'Analytics authorization is not configured' });
        }

        const authorization = req.get('authorization') || '';
        const token = /^Bearer ([^\s]+)$/.exec(authorization)?.[1];
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        let email;
        try {
            const ticket = await oauthClient.verifyIdToken({
                idToken: token,
                audience: googleClientId
            });
            const payload = ticket.getPayload();
            if (!payload?.email || payload.email_verified !== true) {
                return res.status(401).json({ error: 'A verified Google account is required' });
            }
            email = payload.email.toLowerCase();
        } catch (error) {
            console.error('Error verifying analytics administrator:', error);
            return res.status(401).json({ error: 'Invalid authentication token' });
        }

        if (email !== adminEmail) {
            return res.status(403).json({ error: 'Not authorized to access analytics' });
        }

        const { startDate, endDate } = req.query;
        const validDate = (value) => {
            if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
            const date = new Date(`${value}T00:00:00.000Z`);
            return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
        };
        if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) {
            return res.status(400).json({ error: 'A valid startDate and endDate are required' });
        }
        const days = (Date.parse(`${endDate}T00:00:00.000Z`) - Date.parse(`${startDate}T00:00:00.000Z`)) / 86_400_000 + 1;
        if (days > 90) {
            return res.status(400).json({ error: 'The date range cannot exceed 90 days' });
        }

        try {
            const [rows] = await bigquery.query({
                query: ANALYTICS_QUERY,
                params: {
                    start_date: startDate,
                    end_date: endDate
                },
                types: {
                    start_date: 'DATE',
                    end_date: 'DATE'
                },
                useLegacySql: false
            });
            const data = rows.map((row) => ({
                report: row.report,
                dimension: row.dimension,
                label: row.label,
                day: row.day || null,
                eventCount: Number(row.event_count),
                visitorCount: Number(row.visitor_count),
                botCount: Number(row.bot_count)
            }));
            if (data.some((row) =>
                !['summary', 'daily', 'breakdown'].includes(row.report) ||
                !Number.isSafeInteger(row.eventCount) || row.eventCount < 0 ||
                !Number.isSafeInteger(row.visitorCount) || row.visitorCount < 0 ||
                !Number.isSafeInteger(row.botCount) || row.botCount < 0
            )) {
                throw new Error('BigQuery returned invalid analytics data');
            }
            res.set({
                'Cache-Control': 'private, no-store',
                'Vary': 'Authorization'
            });
            res.status(200).json({ rows: data });
        } catch (error) {
            console.error('Error querying private analytics:', error);
            res.status(500).json({ error: 'Unable to load analytics' });
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