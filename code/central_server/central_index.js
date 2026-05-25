require('dotenv').config({ path: `${__dirname}/.env` });

const express    = require('express');
const bodyParser = require('body-parser');
const cors       = require('cors');
const mongoose   = require('mongoose');

const PORT        = parseInt(process.env.PORT) || 4000;
const MONGODB_URI = process.env.MONGODB_URI    || 'mongodb://localhost:27017/BantayLaot_Central';

const app = express();

app.use(cors());  // ← allow all origins during development

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect(MONGODB_URI).then(() => {
    console.log(`Central MongoDB connected to ${MONGODB_URI}`);
    require('./central_router')(app);
    app.listen(PORT, '0.0.0.0', () => {  // ← bind to all interfaces
        console.log(`Central server running on port ${PORT}`);
    });
}).catch(err => {
    console.error(`Central MongoDB FAILED:`, err.message);
    process.exit(1);
});