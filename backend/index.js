const express = require('express');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { Firestore, FieldValue } = require('@google-cloud/firestore');

function createApp(firestore = new Firestore()) {
    const app = express();
    app.set('trust proxy', 1);
    app.use(cors());
    app.use(express.json());

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