const mongoose = require('mongoose');
const axios    = require('axios');

// Read directly from process.env
const MUNICIPALITY_ID    = process.env.MUNICIPALITY_ID    || 'M001';
const MUNICIPALITY_NAME  = process.env.MUNICIPALITY_NAME  || 'Municipality 1';
const CENTRAL_SERVER_URL = process.env.CENTRAL_SERVER_URL || 'http://localhost:4000';
const MY_PORT            = process.env.PORT               || 3001;
const MY_BASE_URL        = process.env.MY_PUBLIC_URL      || `http://localhost:${MY_PORT}`;

// Prepend this server's base URL so the central dashboard can load the image
const withFullImageUrl = (obj) => {
    if (!obj.imageUrl || obj.imageUrl.startsWith('https://') || obj.imageUrl.startsWith('http://')) return obj;
    return { ...obj, imageUrl: `${MY_BASE_URL}${obj.imageUrl}` };
};


async function syncToCentral() {
    try {
        console.log(`[${MUNICIPALITY_NAME}] Starting sync to central...`);

        const Session  = mongoose.model('Session');
        const Location = mongoose.model('Location');
        const Fishing  = mongoose.model('Fishing');
        const Report   = mongoose.model('Report');
        const User     = mongoose.model('User');
        const Boat     = mongoose.model('Boat');

        const [sessions, locations, fishings, reports, users, boats] = await Promise.all([
            Session.find({}).lean(),
            Location.find({}).lean(),
            Fishing.find({}).lean(),
            Report.find({}).lean(),
            User.find({ role: { $in: ['fisher', 'municipal_admin'] } }).lean(),
            Boat.find({}).lean()
        ]);

        await axios.post(`${CENTRAL_SERVER_URL}/api/sync/municipality`, {
            municipalityId: process.env.MUNICIPALITY_ID || 'M001',
            sessions,
            locations,
            fishings: fishings.map(withFullImageUrl),
            reports:  reports.map(withFullImageUrl),
            users,
            boats
        });

        console.log(`[${MUNICIPALITY_NAME}] Sync complete:`,
            `sessions: ${sessions.length},`,
            `locations: ${locations.length},`,
            `fishings: ${fishings.length},`,
            `reports: ${reports.length},`,
            `users: ${users.length},`,
            `boats: ${boats.length}`
        );
    } catch (err) {
        console.error(`[${MUNICIPALITY_NAME}] Sync to central failed:`, err.message);
    }
}

module.exports = syncToCentral;