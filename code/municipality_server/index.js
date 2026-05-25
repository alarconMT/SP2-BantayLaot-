require('dotenv').config({ path: `${__dirname}/.env` });

const express       = require('express');
const bodyParser    = require('body-parser');
const mongoose      = require('mongoose');
const cors          = require('cors');
const path          = require('path');
const syncToCentral = require('./sync_to_central');

const PORT              = parseInt(process.env.PORT)    || 3001;
const MUNICIPALITY_NAME = process.env.MUNICIPALITY_NAME || 'Municipality 1';
const MONGODB_URI       = process.env.MONGODB_URI       || 'mongodb://localhost:27017/BantayLaot_M001';

const app = express();

app.use(cors());  // allow all origins during development

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (filePath.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/png');
        }
    }
}));

mongoose.connect(MONGODB_URI).then(() => {
    console.log(`[${MUNICIPALITY_NAME}] MongoDB connected to ${MONGODB_URI}`);
    require('./router')(app);
    app.listen(PORT, '0.0.0.0', () => {  // ← bind to all interfaces
        console.log(`[${MUNICIPALITY_NAME}] Server running on port ${PORT}`);
        console.log(`[${MUNICIPALITY_NAME}] MongoDB: ${MONGODB_URI}`);
    });
    setTimeout(syncToCentral, 5000);
    setInterval(syncToCentral, 15 * 60 * 1000);
}).catch(err => {
    console.error(`[${MUNICIPALITY_NAME}] MongoDB FAILED:`, err.message);
    process.exit(1);
});