const express = require('express');
const cors = require('cors');
const { Firestore, FieldValue } = require('@google-cloud/firestore');

const app = express();
app.use(cors());
app.use(express.json());
// Initialize Firestore
const firestore = new Firestore();

app.get('/api/visitor-count', async (req, res) => {
    try {
        const docRef = firestore.collection('visitors').doc('count');

        // Increment the visitor count atomically
        await docRef.update({
            count: FieldValue.increment(1)
        });

        // Fetch updated document to return new count
        const doc = await docRef.get();
        const currentCount = doc.data().count;

        res.status(200).json({ count: currentCount });
    } catch (error) {
        console.error('Error updating visitor count:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log('Server listening on port ${PORT}');
});