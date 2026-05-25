const mongoose = require('mongoose');
const jwt      = require('jsonwebtoken');
const bcrypt   = require('bcryptjs');


const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/BantayLaot_Central';

mongoose.connect(MONGODB_URI);
console.log(`Central server connecting to: ${MONGODB_URI}`);

const axios = require('axios');

const MUNICIPALITY_NAMES = {
    '104305000': 'Cagayan de Oro',
    '104321000': 'Opol',
};

const MUNICIPALITY_URLS = {
    '104305000': 'https://municipality-cdo-production.up.railway.app',
    '104321000': 'https://municipality-opol-production.up.railway.app',
};

// Same schemas as municipality — spec section 6
const sessionSchema = new mongoose.Schema({
    userId:         { type: String, required: true },
    boatId:         { type: String, default: '' },
    municipalityId: { type: String, required: true },
    startDateTime:  { type: String, required: true },
    endDateTime:    { type: String, default: null },
    createdAt:      { type: String, required: true }
});

const locationSchema = new mongoose.Schema({
    sessionId:      { type: String, required: true },
    userId:         { type: String, required: true },
    municipalityId: { type: String, required: true },
    latitude:       { type: Number, required: true },
    longitude:      { type: Number, required: true },
    timestamp:      { type: String, required: true }
});

const fishingSchema = new mongoose.Schema({
    sessionId:      { type: String, required: true },
    userId:         { type: String, required: true },
    boatId:         { type: String, default: '' },
    municipalityId: { type: String, required: true },
    fishSpecies:    { type: String, required: true },
    gear:           { type: String, required: true },
    totalWeight:    { type: Number, required: true },
    createdAt:      { type: String },
    imageUrl:       { type: String, default: '' }
});

const reportSchema = new mongoose.Schema({
    sessionId:      { type: String, required: true },
    userId:         { type: String, required: true },
    municipalityId: { type: String, required: true },
    latitude:       { type: Number, required: true },
    longitude:      { type: Number, required: true },
    timestamp:      { type: String, required: true },
    violator:       { type: String, required: true },
    violation:      { type: String, required: true },
    fishingGear:    { type: String, required: true },
    fishingVessel:  { type: String, required: true },
    origin:         { type: String, required: true },
    imageUrl:       { type: String, default: '' }
});

const userSchema = new mongoose.Schema({
    name:           { type: String },
    email:          { type: String },
    municipalityId: { type: String },
    role:           { type: String },
    status:         { type: String },
    createdAt:      { type: String },
    regionCode:     { type: String, default: '' },
    regionName:     { type: String, default: '' },
    provinceCode:   { type: String, default: '' },
    provinceName:   { type: String, default: '' },
    munCityCode:    { type: String, default: '' },
    munCityName:    { type: String, default: '' },
    barangayCode:   { type: String, default: '' },
    barangayName:   { type: String, default: '' }
});

// User schema for central admin accounts
const adminSchema = new mongoose.Schema({
    name:           { type: String, required: true },
    email:          { type: String, required: true, unique: true },
    passwordHash:   { type: String, required: true },
    municipalityId: { type: String, default: 'M000' },
    role:           { type: String, default: 'central_admin' },
    status:         { type: String, default: 'APPROVED' },
    createdAt:      { type: String, required: true }
});

const boatSchema = new mongoose.Schema({
    userId:             { type: String },
    municipalityId:     { type: String },
    boatName:           { type: String },
    boatType:           { type: String },
    length:             { type: Number },
    enginePower:        { type: String },
    registrationNumber: { type: String }
});

const CentralBoat = mongoose.model('Boat', boatSchema);
const CentralAdmin = mongoose.model('Admin', adminSchema);
const CentralSession  = mongoose.model('Session',  sessionSchema);
const CentralLocation = mongoose.model('Location', locationSchema);
const CentralFishing  = mongoose.model('Fishing',  fishingSchema);
const CentralReport   = mongoose.model('Report',   reportSchema);
const CentralUser     = mongoose.model('User',     userSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key';

const verifyCentralAdmin = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).send({ message: 'No token.' });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).send({ message: 'Unauthorized.' });
        if (decoded.role === 'researcher') return res.status(403).send({ message: 'Admin access required.' });
        req.userId = decoded.id;
        next();
    });
};

// Allows both central_admin and researcher
const verifyResearcher = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).send({ message: 'No token.' });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).send({ message: 'Unauthorized.' });
        req.userId   = decoded.id;
        req.userRole = decoded.role || 'central_admin';
        next();
    });
};

exports.verifyResearcher = verifyResearcher;

// POST /api/auth/researcher-setup — create researcher account (central admin only action)
exports.researcherSetup = async (req, res) => {
    try {
        const existing = await CentralAdmin.findOne({ email: req.body.email });
        if (existing) return res.status(400).send({ message: 'Email already in use.' });
        const passwordHash = await bcrypt.hash(req.body.password, 10);
        const admin = await new CentralAdmin({
            name:        req.body.name,
            email:       req.body.email,
            passwordHash,
            role:        'researcher',
            status:      'APPROVED',
            createdAt:   new Date().toISOString()
        }).save();
        res.status(200).send({ message: 'Researcher account created.', userId: admin._id });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// POST /api/auth/admin-setup — create central admin account
exports.adminSetup = async (req, res) => {
    try {
        const existing = await CentralAdmin.findOne({ email: req.body.email });
        if (existing) return res.status(400).send({ message: 'Email already in use.' });

        const passwordHash = await bcrypt.hash(req.body.password, 10);
        const admin = await new CentralAdmin({
            name:        req.body.name,
            email:       req.body.email,
            passwordHash,
            role:        'central_admin',
            status:      'APPROVED',
            createdAt:   new Date().toISOString()
        }).save();

        res.status(200).send({ message: 'Central admin created.', userId: admin._id });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// POST /api/auth/login — central admin login
exports.login = async (req, res) => {
    try {
        const admin = await CentralAdmin.findOne({ email: req.body.email });
        if (!admin) return res.status(404).send({ message: 'Admin not found.' });

        const valid = await bcrypt.compare(req.body.password, admin.passwordHash);
        if (!valid) return res.status(401).send({ message: 'Invalid password.' });

        const token = jwt.sign({ id: admin._id, role: admin.role }, JWT_SECRET, { expiresIn: 86400 });

        res.status(200).send({
            token,
            userId:         admin._id.toString(),
            municipalityId: 'M000',
            role:           admin.role,
            name:           admin.name
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// Receive bulk data from a municipality server
exports.receiveMunicipalitySync = async (req, res) => {
    try {
        const { municipalityId, sessions, locations, fishings, reports, users, boats } = req.body;

        console.log(`Receiving sync from ${municipalityId}:`,
            `sessions: ${sessions?.length},`,
            `locations: ${locations?.length},`,
            `fishings: ${fishings?.length},`,
            `reports: ${reports?.length},`,
            `users: ${users?.length},`,
            `boats: ${boats?.length}`
        );

        const upsertAll = async (Model, data, label) => {
            if (!data?.length) return;
            try {
                const ops = data.map(d => ({
                    updateOne: {
                        filter: { _id: d._id },
                        update: { $set: d },
                        upsert: true
                    }
                }));
                const r = await Model.bulkWrite(ops, { ordered: false });
                console.log(`${label}: inserted=${r.upsertedCount}, modified=${r.modifiedCount}`);
            } catch (e) {
                console.log(`${label} sync error:`, e.message);
            }
        };

        // Users: upsert all fields, but never overwrite a resolved status with PENDING.
        // Status from the municipality is only applied when the doc is new (setOnInsert)
        // or when it's a resolved state (APPROVED/DECLINED/DEACTIVATED).
        const syncUsers = async (data) => {
            if (!data?.length) return;
            try {
                const ops = data.map(d => {
                    const { status, ...rest } = d;
                    const update = { $set: rest };
                    if (status && status !== 'PENDING') {
                        update.$set.status = status;
                    } else {
                        update.$setOnInsert = { status: status || 'PENDING' };
                    }
                    return { updateOne: { filter: { _id: d._id }, update, upsert: true } };
                });
                const r = await CentralUser.bulkWrite(ops, { ordered: false });
                console.log(`Users: inserted=${r.upsertedCount}, modified=${r.modifiedCount}`);
            } catch (e) {
                console.log('Users sync error:', e.message);
            }
        };

        await upsertAll(CentralSession,  sessions,  'Sessions');
        await upsertAll(CentralLocation, locations, 'Locations');
        await upsertAll(CentralFishing,  fishings,  'Fishings');
        await upsertAll(CentralReport,   reports,   'Reports');
        await syncUsers(users);
        await upsertAll(CentralBoat,     boats,     'Boats');

        res.status(200).send({ message: 'Sync received.' });
    } catch (err) {
        console.error('Central sync error:', err.message);
        res.status(500).send({ message: err.message });
    }
};

exports.getDashboardData = [verifyCentralAdmin, async (req, res) => {
    try {
        const sessions = await CentralSession.find({}).lean();

        // Get all unique userIds from sessions
        const userIds = [...new Set(sessions.map(s => s.userId))];
        
        // Fetch users — match by _id as string since synced data stores _id as ObjectId
        const users = await CentralUser.find({}).lean();
        const boats = await CentralBoat.find({}).lean();

        const enriched = await Promise.all(sessions.map(async (session) => {
            const sid = session._id.toString();
            const [locations, fishings, reports] = await Promise.all([
                CentralLocation.find({ sessionId: sid }).lean(),
                CentralFishing.find({  sessionId: sid }).lean(),
                CentralReport.find({   sessionId: sid }).lean()
            ]);

            // Match user — compare both as strings to handle ObjectId vs string mismatch
            const owner = users.find(u =>
                u._id.toString() === session.userId.toString()
            );
            const boat = boats.find(b =>
                b.userId.toString() === session.userId.toString()
            );

            return { session, locations, fishings, reports, user: owner, boat };
        }));

        res.status(200).send(enriched);
    } catch (err) {
        console.error('Dashboard error:', err.message);
        res.status(500).send({ message: err.message });
    }
}];

// Debug
exports.getCounts = async (req, res) => {
    try {
        res.status(200).send({
            sessions:  await CentralSession.countDocuments(),
            locations: await CentralLocation.countDocuments(),
            fishings:  await CentralFishing.countDocuments(),
            reports:   await CentralReport.countDocuments(),
            users:     await CentralUser.countDocuments(),
            boats:     await CentralBoat.countDocuments(),
            byMunicipality: {
                '104305000': await CentralSession.countDocuments({ municipalityId: '104305000' }),
                '104321000': await CentralSession.countDocuments({ municipalityId: '104321000' }),
                M001: await CentralSession.countDocuments({ municipalityId: 'M001' }),
                M002: await CentralSession.countDocuments({ municipalityId: 'M002' }),
            },
            munSample: await CentralSession.findOne({}, { municipalityId: 1, _id: 0 }).lean()
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// central_admin sees all users and admins across all municipalities
exports.getUsers = [verifyCentralAdmin, async (req, res) => {
    try {
        const users = await CentralUser.find({
            role: { $in: ['fisher', 'municipal_admin'] }
        }).select('-passwordHash').lean();

        // Attach boat to each fisher
        const withBoats = await Promise.all(users.map(async (user) => {
            const boat = await CentralBoat.findOne({ userId: user._id.toString() }).lean();
            return { ...user, boat };
        }));

        res.status(200).send(withBoats);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// central_admin can update roles of municipal_admins
exports.updateUser = [verifyCentralAdmin, async (req, res) => {
    try {
        const target = await CentralUser.findById(req.params.id);
        if (!target) return res.status(404).send({ message: 'User not found.' });

        // Cannot assign fisher role via admin panel
        if (req.body.role === 'fisher')
            return res.status(400).send({ message: 'Cannot assign fisher role via admin panel.' });

        // Cannot change another central admin
        if (target.role === 'central_admin')
            return res.status(403).send({ message: 'Cannot modify another central admin.' });

        delete req.body.passwordHash;
        delete req.body.password;

        const updated = await CentralUser.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        ).select('-passwordHash');

        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// central_admin can approve/decline any user
exports.updateUserStatus = [verifyCentralAdmin, async (req, res) => {
    try {
        const target = await CentralUser.findById(req.params.id);
        if (!target) return res.status(404).send({ message: 'User not found.' });

        const newStatus = req.body.status;
        if (!['APPROVED', 'DECLINED', 'DEACTIVATED'].includes(newStatus))
            return res.status(400).send({ message: 'Status must be APPROVED, DECLINED, or DEACTIVATED.' });

        const updated = await CentralUser.findByIdAndUpdate(
            req.params.id,
            { $set: { status: newStatus } },
            { new: true }
        ).select('-passwordHash');

        // Propagate to the municipality server so the user can log in immediately
        const munUrl = MUNICIPALITY_URLS[target.municipalityId];
        if (munUrl) {
            axios.put(
                `${munUrl}/api/internal/users/${req.params.id}/status`,
                { status: newStatus },
                { timeout: 5000 }
            ).catch(err => console.error(`Status propagation to ${target.municipalityId} failed:`, err.message));
        }

        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// central_admin can delete anyone except other central admins
exports.deleteUser = [verifyCentralAdmin, async (req, res) => {
    try {
        const target = await CentralUser.findById(req.params.id);
        if (!target) return res.status(404).send({ message: 'User not found.' });

        if (target.role === 'central_admin')
            return res.status(403).send({ message: 'Cannot delete a central admin.' });

        if (target.role === 'fisher') {
            await CentralBoat.findOneAndDelete({ userId: target._id.toString() });
        }

        await CentralUser.findByIdAndDelete(req.params.id);
        res.status(200).send({ message: 'User deleted.' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// central_admin sees all reports across all municipalities
exports.getReports = [verifyCentralAdmin, async (req, res) => {
    try {
        const reports = await CentralReport.find({}).sort({ timestamp: -1 }).lean();
        res.status(200).send(reports);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/auth/admin-exists
exports.adminExists = async (req, res) => {
    try {
        const admin = await CentralAdmin.findOne({ role: 'central_admin' });
        res.status(200).send({ exists: !!admin });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.homepage = (req, res) => res.send('BantayLaot Central Server');

// GET /api/researchers — list all researcher accounts
exports.getResearchers = [verifyCentralAdmin, async (req, res) => {
    try {
        const researchers = await CentralAdmin.find({ role: 'researcher' })
            .select('-passwordHash').lean();
        res.status(200).send(researchers);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// PUT /api/researchers/:id/status — approve or deactivate a researcher account
exports.updateResearcherStatus = [verifyCentralAdmin, async (req, res) => {
    try {
        const target = await CentralAdmin.findById(req.params.id);
        if (!target) return res.status(404).send({ message: 'Not found.' });
        if (target.role !== 'researcher') return res.status(400).send({ message: 'Not a researcher account.' });

        const newStatus = req.body.status;
        if (!['APPROVED', 'DEACTIVATED'].includes(newStatus))
            return res.status(400).send({ message: 'Status must be APPROVED or DEACTIVATED.' });

        const updated = await CentralAdmin.findByIdAndUpdate(
            req.params.id,
            { $set: { status: newStatus } },
            { new: true }
        ).select('-passwordHash');
        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// DELETE /api/researchers/:id — remove a researcher account
exports.deleteResearcher = [verifyCentralAdmin, async (req, res) => {
    try {
        const target = await CentralAdmin.findById(req.params.id);
        if (!target) return res.status(404).send({ message: 'Not found.' });
        if (target.role !== 'researcher')
            return res.status(400).send({ message: 'Not a researcher account.' });
        await CentralAdmin.findByIdAndDelete(req.params.id);
        res.status(200).send({ message: 'Researcher deleted.' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// ── Central analytics endpoints ───────────────────────────────────────────────

const GEARS = ['Surface Gill Net', 'Bottom Set Gill Net', 'Hook And Line'];

const computeCPUE = (sessions, fishings) => {
    const map = {};
    GEARS.forEach(g => { map[g] = { weight: 0, hours: 0 }; });
    sessions.forEach(session => {
        if (!session.endDateTime) return;
        const hours = (new Date(session.endDateTime) - new Date(session.startDateTime)) / 3.6e6;
        if (hours <= 0) return;
        const sf = fishings.filter(f => f.sessionId === session._id.toString());
        const used = new Set(sf.map(f => f.gear));
        sf.forEach(f => { if (map[f.gear]) map[f.gear].weight += f.totalWeight; });
        used.forEach(g => { if (map[g]) map[g].hours += hours; });
    });
    const result = {};
    Object.entries(map).forEach(([g, { weight, hours }]) => {
        if (hours > 0) result[g] = weight / hours;
    });
    return result;
};

const aggregateFishCatch = (fishings) => {
    const map = {};
    fishings.forEach(f => { map[f.fishSpecies] = (map[f.fishSpecies] || 0) + f.totalWeight; });
    return Object.entries(map).map(([species, weight]) => ({ species, weight }));
};

const phDateRange = (date) => {
    const next = new Date(date + 'T00:00:00Z');
    next.setUTCDate(next.getUTCDate() + 1);
    return { start: date, end: next.toISOString().slice(0, 10) };
};

const monthDateRange = (month, year) => {
    const pad = n => String(n).padStart(2, '0');
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    return { start: `${year}-${pad(month)}-01`, end: `${ny}-${pad(nm)}-01` };
};

// GET /api/summary/violations?month=&year=&municipality=
exports.getSummaryViolations = [verifyCentralAdmin, async (req, res) => {
    try {
        const month        = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year         = parseInt(req.query.year)  || new Date().getFullYear();
        const municipality = req.query.municipality || '';
        const { start, end } = monthDateRange(month, year);

        // Always fetch all municipalities so the comparison chart is never filtered
        const reports = await CentralReport.find({ timestamp: { $gte: start, $lt: end } }).lean();

        const userIds = [...new Set(reports.map(r => r.userId))];
        const users   = await CentralUser.find({ _id: { $in: userIds } }).lean();
        const userMap = {};
        users.forEach(u => { userMap[u._id.toString()] = u; });

        // By municipality — always all municipalities
        const byMun = {};
        reports.forEach(r => {
            const name = MUNICIPALITY_NAMES[r.municipalityId] || r.municipalityId;
            byMun[name] = (byMun[name] || 0) + 1;
        });
        const total = reports.length;
        const byMunicipality = Object.entries(byMun).map(([municipalityName, count]) => ({
            municipalityName, count,
            percentage: total > 0 ? +((count / total) * 100).toFixed(1) : 0
        }));

        // By barangay — only when a municipality is selected, filtered from already-fetched reports
        let byBarangay = [];
        if (municipality) {
            const munReports = reports.filter(r => r.municipalityId === municipality);
            const byBrgy = {};
            munReports.forEach(r => {
                const barangay = userMap[r.userId]?.barangayName || 'Unknown';
                byBrgy[barangay] = (byBrgy[barangay] || 0) + 1;
            });
            const munTotal = munReports.length;
            byBarangay = Object.entries(byBrgy).map(([barangayName, count]) => ({
                barangayName, count,
                percentage: munTotal > 0 ? +((count / munTotal) * 100).toFixed(1) : 0
            }));
        }

        const mapReports = reports.map(r => ({
            latitude:         r.latitude,
            longitude:        r.longitude,
            violation:        r.violation,
            violator:         r.violator,
            reporterName:     userMap[r.userId]?.name || '',
            barangayName:     userMap[r.userId]?.barangayName || '',
            fishingGear:      r.fishingGear || '',
            fishingVessel:    r.fishingVessel || '',
            origin:           r.origin || '',
            municipalityId:   r.municipalityId,
            municipalityName: MUNICIPALITY_NAMES[r.municipalityId] || r.municipalityId,
            imageUrl:         r.imageUrl || '',
            timestamp:        r.timestamp
        }));

        res.status(200).send({ total, byMunicipality, byBarangay, reports: mapReports });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/summary/cpue?month=&year=&municipality=&barangay=
exports.getSummaryCPUE = [verifyCentralAdmin, async (req, res) => {
    try {
        const month        = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year         = parseInt(req.query.year)  || new Date().getFullYear();
        const municipality = req.query.municipality || '';
        const barangay     = req.query.barangay || '';
        const { start, end } = monthDateRange(month, year);

        const sessionFilter = municipality ? { municipalityId: municipality } : {};
        const sessions = await CentralSession.find({
            ...sessionFilter,
            startDateTime: { $gte: start, $lt: end }
        }).lean();

        const userIds = [...new Set(sessions.map(s => s.userId))];
        let users = await CentralUser.find({ _id: { $in: userIds } }).lean();
        if (municipality) users = users.filter(u => u.municipalityId === municipality);
        if (barangay)     users = users.filter(u => u.barangayName === barangay);

        const filteredUids     = new Set(users.map(u => u._id.toString()));
        const filteredSessions = sessions.filter(s => filteredUids.has(s.userId));
        const sessionIds       = filteredSessions.map(s => s._id.toString());

        const [allFishings, boats] = await Promise.all([
            CentralFishing.find({ sessionId: { $in: sessionIds } }).lean(),
            CentralBoat.find({ userId: { $in: [...filteredUids] } }).lean()
        ]);

        const fishCatch = aggregateFishCatch(allFishings);
        const cpue      = computeCPUE(filteredSessions, allFishings);

        const usersList = users.map(user => {
            const uid          = user._id.toString();
            const userSessions = filteredSessions.filter(s => s.userId === uid);
            const sids         = userSessions.map(s => s._id.toString());
            const userFishings = allFishings.filter(f => sids.includes(f.sessionId));
            const boat         = boats.find(b => b.userId === uid);
            return {
                userId:       uid,
                name:         user.name,
                boatName:     boat?.boatName || '',
                barangayName: user.barangayName || '',
                municipalityName: MUNICIPALITY_NAMES[user.municipalityId] || user.municipalityId || '',
                sessionCount: userSessions.length,
                fishCatch:    aggregateFishCatch(userFishings),
                cpue:         computeCPUE(userSessions, userFishings)
            };
        });

        res.status(200).send({ fishCatch, cpue, users: usersList });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/summary/sessions-map?month=&year=&municipality=&barangay=
exports.getSummarySessionsMap = [verifyCentralAdmin, async (req, res) => {
    try {
        const month        = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year         = parseInt(req.query.year)  || new Date().getFullYear();
        const municipality = req.query.municipality || '';
        const barangay     = req.query.barangay || '';
        const { start, end } = monthDateRange(month, year);

        const filter   = municipality ? { municipalityId: municipality } : {};
        let sessions   = await CentralSession.find({ ...filter, startDateTime: { $gte: start, $lt: end } }).lean();

        const allUserIds = [...new Set(sessions.map(s => s.userId))];
        const allUsers   = await CentralUser.find({ _id: { $in: allUserIds } }, { barangayName: 1 }).lean();
        const userBrgy   = {};
        allUsers.forEach(u => { userBrgy[u._id.toString()] = u.barangayName || ''; });

        if (barangay) {
            sessions = sessions.filter(s => userBrgy[s.userId] === barangay);
        }

        const sessionIds = sessions.map(s => s._id.toString());
        const locations  = await CentralLocation.find({ sessionId: { $in: sessionIds } }).lean();

        const locBySession = {};
        locations.forEach(l => {
            if (!locBySession[l.sessionId]) locBySession[l.sessionId] = [];
            locBySession[l.sessionId].push(l);
        });

        const routes = sessions
            .map(s => ({
                sessionId:      s._id.toString(),
                municipalityId: s.municipalityId,
                barangayName:   userBrgy[s.userId] || '',
                locations: (locBySession[s._id.toString()] || [])
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            }))
            .filter(r => r.locations.length >= 2);

        res.status(200).send({ routes });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/sessions/recent-date
exports.getRecentSessionDate = [verifyCentralAdmin, async (req, res) => {
    try {
        const mun     = req.query.municipality || '';
        const filter  = mun ? { municipalityId: mun } : {};
        const session = await CentralSession.findOne(filter).sort({ startDateTime: -1 }).lean();
        res.status(200).send({ date: session ? session.startDateTime.slice(0, 10) : null });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/violations/recent-date
exports.getRecentViolationDate = [verifyCentralAdmin, async (req, res) => {
    try {
        const mun    = req.query.municipality || '';
        const filter = mun ? { municipalityId: mun } : {};
        const report = await CentralReport.findOne(filter).sort({ timestamp: -1 }).lean();
        res.status(200).send({ date: report ? report.timestamp.slice(0, 10) : null });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// Researcher-accessible versions (same logic, verifyResearcher middleware)
exports.getResearcherRecentSessionDate = [verifyResearcher, async (req, res) => {
    try {
        const mun     = req.query.municipality || '';
        const filter  = mun ? { municipalityId: mun } : {};
        const session = await CentralSession.findOne(filter).sort({ startDateTime: -1 }).lean();
        res.status(200).send({ date: session ? session.startDateTime.slice(0, 10) : null });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

exports.getResearcherRecentViolationDate = [verifyResearcher, async (req, res) => {
    try {
        const mun    = req.query.municipality || '';
        const filter = mun ? { municipalityId: mun } : {};
        const report = await CentralReport.findOne(filter).sort({ timestamp: -1 }).lean();
        res.status(200).send({ date: report ? report.timestamp.slice(0, 10) : null });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/sessions/by-date?date=YYYY-MM-DD&municipality=&barangay=
exports.getSessionsByDate = [verifyCentralAdmin, async (req, res) => {
    try {
        const { date, municipality, barangay } = req.query;
        if (!date) return res.status(400).send({ message: 'date required' });
        const { start, end } = phDateRange(date);

        const sessionFilter = municipality ? { municipalityId: municipality } : {};
        const sessions = await CentralSession.find({
            ...sessionFilter,
            startDateTime: { $gte: start, $lt: end }
        }).lean();

        if (!sessions.length) return res.status(200).send({ fishCatch: [], cpue: {}, users: [] });

        const userIds    = [...new Set(sessions.map(s => s.userId))];
        const sessionIds = sessions.map(s => s._id.toString());

        const [users, boats, allFishings, allLocations, allReports] = await Promise.all([
            CentralUser.find({ _id: { $in: userIds } }).lean(),
            CentralBoat.find({ userId: { $in: userIds } }).lean(),
            CentralFishing.find({ sessionId: { $in: sessionIds } }).lean(),
            CentralLocation.find({ sessionId: { $in: sessionIds } }).lean(),
            CentralReport.find({ sessionId: { $in: sessionIds } }).lean()
        ]);

        let filteredUsers = users;
        if (municipality) filteredUsers = filteredUsers.filter(u => u.municipalityId === municipality);
        if (barangay)     filteredUsers = filteredUsers.filter(u => u.barangayName === barangay);
        const filteredUids     = new Set(filteredUsers.map(u => u._id.toString()));
        const filteredSessions = sessions.filter(s => filteredUids.has(s.userId));

        const fishCatch = aggregateFishCatch(allFishings.filter(f =>
            filteredSessions.some(s => s._id.toString() === f.sessionId)
        ));
        const cpue = computeCPUE(filteredSessions, allFishings);

        const sessionsByUser = {};
        filteredSessions.forEach(s => {
            if (!sessionsByUser[s.userId]) sessionsByUser[s.userId] = [];
            sessionsByUser[s.userId].push(s);
        });

        const usersList = filteredUsers.map(user => {
            const uid          = user._id.toString();
            const userSessions = sessionsByUser[uid] || [];
            const boat         = boats.find(b => b.userId === uid);
            const sessionsData = userSessions.map(s => {
                const sid = s._id.toString();
                return {
                    session:   s,
                    fishings:  allFishings.filter(f => f.sessionId === sid),
                    locations: allLocations.filter(l => l.sessionId === sid),
                    reports:   allReports.filter(r => r.sessionId === sid)
                };
            });
            return {
                userId:           uid,
                name:             user.name,
                boatName:         boat?.boatName || '',
                barangayName:     user.barangayName || '',
                municipalityId:   user.municipalityId || '',
                municipalityName: MUNICIPALITY_NAMES[user.municipalityId] || user.municipalityId || '',
                sessionCount:     userSessions.length,
                sessions:         sessionsData
            };
        });

        res.status(200).send({ fishCatch, cpue, users: usersList });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/violations/by-date?date=YYYY-MM-DD&municipality=&barangay=
exports.getViolationsByDate = [verifyCentralAdmin, async (req, res) => {
    try {
        const { date, municipality, barangay } = req.query;
        if (!date) return res.status(400).send({ message: 'date required' });
        const { start, end } = phDateRange(date);

        const reportFilter = municipality ? { municipalityId: municipality } : {};
        const reports = await CentralReport.find({
            ...reportFilter,
            timestamp: { $gte: start, $lt: end }
        }).lean();

        if (!reports.length) return res.status(200).send({ violationCounts: [], total: 0, users: [] });

        const userIds = [...new Set(reports.map(r => r.userId))];
        let [users, boats] = await Promise.all([
            CentralUser.find({ _id: { $in: userIds } }).lean(),
            CentralBoat.find({ userId: { $in: userIds } }).lean()
        ]);

        if (municipality) users = users.filter(u => u.municipalityId === municipality);
        if (barangay)     users = users.filter(u => u.barangayName === barangay);
        const filteredUids = new Set(users.map(u => u._id.toString()));
        const filteredReports = reports.filter(r => filteredUids.has(r.userId));

        const typeCounts = {};
        filteredReports.forEach(r => {
            typeCounts[r.violation] = (typeCounts[r.violation] || 0) + 1;
        });
        const violationCounts = Object.entries(typeCounts).map(([violation, count]) => ({ violation, count }));

        const reportsByUser = {};
        filteredReports.forEach(r => {
            if (!reportsByUser[r.userId]) reportsByUser[r.userId] = [];
            reportsByUser[r.userId].push(r);
        });

        const usersList = users.map(user => {
            const uid  = user._id.toString();
            const boat = boats.find(b => b.userId === uid);
            return {
                userId:           uid,
                name:             user.name,
                boatName:         boat?.boatName || '',
                barangayName:     user.barangayName || '',
                municipalityId:   user.municipalityId || '',
                municipalityName: MUNICIPALITY_NAMES[user.municipalityId] || user.municipalityId || '',
                reportCount:      (reportsByUser[uid] || []).length,
                reports:          reportsByUser[uid] || []
            };
        });

        res.status(200).send({ violationCounts, total: filteredReports.length, users: usersList });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// ── Researcher endpoints (anonymized — no user names / boat names) ─────────────

// GET /api/researcher/summary/violations  (reuses same logic, already no PII)
exports.getResearcherSummaryViolations = [verifyResearcher, async (req, res) => {
    req.query = req.query; // pass-through
    return exports.getSummaryViolations[1](req, res);
}];

// GET /api/researcher/summary/cpue — CPUE with anonymized users
exports.getResearcherSummaryCPUE = [verifyResearcher, async (req, res) => {
    try {
        const month        = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year         = parseInt(req.query.year)  || new Date().getFullYear();
        const municipality = req.query.municipality || '';
        const barangay     = req.query.barangay || '';
        const { start, end } = monthDateRange(month, year);

        const sessionFilter = municipality ? { municipalityId: municipality } : {};
        const sessions = await CentralSession.find({ ...sessionFilter, startDateTime: { $gte: start, $lt: end } }).lean();
        const userIds  = [...new Set(sessions.map(s => s.userId))];
        let users      = await CentralUser.find({ _id: { $in: userIds } }).lean();
        if (municipality) users = users.filter(u => u.municipalityId === municipality);
        if (barangay)     users = users.filter(u => u.barangayName === barangay);

        const filteredUids     = new Set(users.map(u => u._id.toString()));
        const filteredSessions = sessions.filter(s => filteredUids.has(s.userId));
        const sessionIds       = filteredSessions.map(s => s._id.toString());
        const allFishings      = await CentralFishing.find({ sessionId: { $in: sessionIds } }).lean();

        const fishCatch = aggregateFishCatch(allFishings);
        const cpue      = computeCPUE(filteredSessions, allFishings);

        const usersList = users.map((user, idx) => {
            const uid          = user._id.toString();
            const userSessions = filteredSessions.filter(s => s.userId === uid);
            const sids         = userSessions.map(s => s._id.toString());
            const userFishings = allFishings.filter(f => sids.includes(f.sessionId));
            return {
                userId:           `fisher_${idx + 1}`,
                name:             `Fisher ${idx + 1}`,
                barangayName:     user.barangayName || '',
                municipalityName: MUNICIPALITY_NAMES[user.municipalityId] || user.municipalityId || '',
                sessionCount:     userSessions.length,
                fishCatch:        aggregateFishCatch(userFishings),
                cpue:             computeCPUE(userSessions, userFishings)
            };
        });

        res.status(200).send({ fishCatch, cpue, users: usersList });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/researcher/summary/sessions-map — anonymized session routes
exports.getResearcherSummarySessionsMap = [verifyResearcher, async (req, res) => {
    try {
        const month        = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year         = parseInt(req.query.year)  || new Date().getFullYear();
        const municipality = req.query.municipality || '';
        const barangay     = req.query.barangay || '';
        const { start, end } = monthDateRange(month, year);

        const filter   = municipality ? { municipalityId: municipality } : {};
        let sessions   = await CentralSession.find({ ...filter, startDateTime: { $gte: start, $lt: end } }).lean();

        const allUserIds = [...new Set(sessions.map(s => s.userId))];
        const allUsers   = await CentralUser.find({ _id: { $in: allUserIds } }, { barangayName: 1 }).lean();
        const userBrgy   = {};
        allUsers.forEach(u => { userBrgy[u._id.toString()] = u.barangayName || ''; });

        if (barangay) {
            sessions = sessions.filter(s => userBrgy[s.userId] === barangay);
        }

        const sessionIds = sessions.map(s => s._id.toString());
        const locations  = await CentralLocation.find({ sessionId: { $in: sessionIds } }).lean();

        const locBySession = {};
        locations.forEach(l => {
            if (!locBySession[l.sessionId]) locBySession[l.sessionId] = [];
            locBySession[l.sessionId].push(l);
        });

        const routes = sessions
            .map(s => ({
                sessionId:      s._id.toString(),
                municipalityId: s.municipalityId,
                barangayName:   userBrgy[s.userId] || '',
                locations: (locBySession[s._id.toString()] || [])
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            }))
            .filter(r => r.locations.length >= 2);

        res.status(200).send({ routes });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/researcher/sessions/by-date — sessions with routes, no names
exports.getResearcherSessionsByDate = [verifyResearcher, async (req, res) => {
    try {
        const { date, municipality, barangay } = req.query;
        if (!date) return res.status(400).send({ message: 'date required' });
        const { start, end } = phDateRange(date);

        const sessionFilter = municipality ? { municipalityId: municipality } : {};
        const sessions = await CentralSession.find({ ...sessionFilter, startDateTime: { $gte: start, $lt: end } }).lean();
        if (!sessions.length) return res.status(200).send({ fishCatch: [], cpue: {}, users: [] });

        const userIds    = [...new Set(sessions.map(s => s.userId))];
        const sessionIds = sessions.map(s => s._id.toString());

        const [users, allFishings, allLocations, allReports] = await Promise.all([
            CentralUser.find({ _id: { $in: userIds } }).lean(),
            CentralFishing.find({ sessionId: { $in: sessionIds } }).lean(),
            CentralLocation.find({ sessionId: { $in: sessionIds } }).lean(),
            CentralReport.find({ sessionId: { $in: sessionIds } }).lean()
        ]);

        let filteredUsers = users;
        if (municipality) filteredUsers = filteredUsers.filter(u => u.municipalityId === municipality);
        if (barangay)     filteredUsers = filteredUsers.filter(u => u.barangayName === barangay);
        const filteredUids     = new Set(filteredUsers.map(u => u._id.toString()));
        const filteredSessions = sessions.filter(s => filteredUids.has(s.userId));

        const fishCatch = aggregateFishCatch(allFishings.filter(f => filteredSessions.some(s => s._id.toString() === f.sessionId)));
        const cpue      = computeCPUE(filteredSessions, allFishings);

        const sessionsByUser = {};
        filteredSessions.forEach(s => {
            if (!sessionsByUser[s.userId]) sessionsByUser[s.userId] = [];
            sessionsByUser[s.userId].push(s);
        });

        const usersList = filteredUsers.map((user, idx) => {
            const uid          = user._id.toString();
            const userSessions = sessionsByUser[uid] || [];
            const sessionsData = userSessions.map(s => {
                const sid = s._id.toString();
                return {
                    session:   s,
                    fishings:  allFishings.filter(f => f.sessionId === sid),
                    locations: allLocations.filter(l => l.sessionId === sid),
                    reports:   allReports.filter(r => r.sessionId === sid)
                };
            });
            return {
                userId:           `fisher_${idx + 1}`,
                name:             `Fisher ${idx + 1}`,
                barangayName:     user.barangayName || '',
                municipalityId:   user.municipalityId || '',
                municipalityName: MUNICIPALITY_NAMES[user.municipalityId] || user.municipalityId || '',
                sessionCount:     userSessions.length,
                sessions:         sessionsData
            };
        });

        res.status(200).send({ fishCatch, cpue, users: usersList });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/researcher/violations/by-date — violations without reporter/violator names
exports.getResearcherViolationsByDate = [verifyResearcher, async (req, res) => {
    try {
        const { date, municipality, barangay } = req.query;
        if (!date) return res.status(400).send({ message: 'date required' });
        const { start, end } = phDateRange(date);

        const reportFilter = municipality ? { municipalityId: municipality } : {};
        const reports = await CentralReport.find({ ...reportFilter, timestamp: { $gte: start, $lt: end } }).lean();
        if (!reports.length) return res.status(200).send({ violationCounts: [], total: 0, users: [] });

        const userIds = [...new Set(reports.map(r => r.userId))];
        let users     = await CentralUser.find({ _id: { $in: userIds } }).lean();
        if (municipality) users = users.filter(u => u.municipalityId === municipality);
        if (barangay)     users = users.filter(u => u.barangayName === barangay);
        const filteredUids    = new Set(users.map(u => u._id.toString()));
        const filteredReports = reports.filter(r => filteredUids.has(r.userId));

        const typeCounts = {};
        filteredReports.forEach(r => { typeCounts[r.violation] = (typeCounts[r.violation] || 0) + 1; });
        const violationCounts = Object.entries(typeCounts).map(([violation, count]) => ({ violation, count }));

        const reportsByUser = {};
        filteredReports.forEach(r => {
            if (!reportsByUser[r.userId]) reportsByUser[r.userId] = [];
            reportsByUser[r.userId].push({
                // Strip violator name; keep all research-relevant fields
                violation:    r.violation,
                fishingGear:  r.fishingGear,
                fishingVessel: r.fishingVessel,
                origin:       r.origin,
                latitude:     r.latitude,
                longitude:    r.longitude,
                timestamp:    r.timestamp,
                imageUrl:     r.imageUrl,
                municipalityId: r.municipalityId
            });
        });

        const usersList = users.map((user, idx) => ({
            userId:           `fisher_${idx + 1}`,
            name:             `Fisher ${idx + 1}`,
            barangayName:     user.barangayName || '',
            municipalityId:   user.municipalityId || '',
            municipalityName: MUNICIPALITY_NAMES[user.municipalityId] || user.municipalityId || '',
            reportCount:      (reportsByUser[user._id.toString()] || []).length,
            reports:          reportsByUser[user._id.toString()] || []
        }));

        res.status(200).send({ violationCounts, total: filteredReports.length, users: usersList });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];
// GET /api/researcher/user-stats — aggregate fisher counts, no PII
exports.getResearcherUserStats = [verifyResearcher, async (req, res) => {
    try {
        const users = await CentralUser.find({ role: 'fisher' }).select('municipalityId barangayName status').lean();

        const byMunicipality = {};
        const byBarangay     = {};

        users.forEach(u => {
            const mun = MUNICIPALITY_NAMES[u.municipalityId] || u.municipalityId || 'Unknown';
            const brg = u.barangayName || 'Unknown';
            const key = `${u.municipalityId}||${brg}`;

            if (!byMunicipality[mun]) byMunicipality[mun] = { total: 0, approved: 0, pending: 0 };
            byMunicipality[mun].total++;
            if (u.status === 'APPROVED') byMunicipality[mun].approved++;
            if (u.status === 'PENDING')  byMunicipality[mun].pending++;

            if (!byBarangay[key]) byBarangay[key] = { municipalityId: u.municipalityId, municipalityName: mun, barangayName: brg, total: 0, approved: 0, pending: 0 };
            byBarangay[key].total++;
            if (u.status === 'APPROVED') byBarangay[key].approved++;
            if (u.status === 'PENDING')  byBarangay[key].pending++;
        });

        res.status(200).send({
            totalFishers:    users.filter(u => u.status === 'APPROVED').length,
            byMunicipality:  Object.entries(byMunicipality).map(([municipalityName, d]) => ({ municipalityName, ...d })),
            byBarangay:      Object.values(byBarangay),
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];
