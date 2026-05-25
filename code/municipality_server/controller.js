// municipality_server/controller.js — TOP OF FILE, first lines
const mongoose   = require('mongoose');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const axios      = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadToCloudinary(buffer, folder) {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (error, result) => error ? reject(error) : resolve(result)
        ).end(buffer);
    });
}

const reverseGeocode = async (lat, lon) => {
    try {
        const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: { lat, lon, format: 'json' },
            headers: { 'User-Agent': 'BantayLaot/1.0' },
            timeout: 5000
        });
        const addr = res.data.address || {};
        const parts = [
            addr.village || addr.suburb || addr.neighbourhood || addr.hamlet,
            addr.city || addr.municipality || addr.town || addr.county,
            addr.state
        ].filter(Boolean);
        return parts.slice(0, 3).join(', ') || res.data.display_name || '';
    } catch {
        return '';
    }
};

// Read directly from process.env — no config object needed
// const MUNICIPALITY_ID   = process.env.MUNICIPALITY_ID   || 'M001';
// const MUNICIPALITY_NAME = process.env.MUNICIPALITY_NAME || 'Municipality 1';
// const MONGODB_URI       = process.env.MONGODB_URI       || 'mongodb://localhost:27017/BantayLaot_M001';
const JWT_SECRET        = process.env.JWT_SECRET        || 'your_super_secret_key';

// mongoose.connect() is intentionally NOT called here.
// Connection is established in index.js using process.env.MONGODB_URI,
// which PM2 sets per-instance via ecosystem.config.js.

// ── Schemas ───────────────────────────────────────────────────────────────────

const municipalitySchema = new mongoose.Schema({
    name:      { type: String, required: true },
    province:  { type: String, required: true },
    region:    { type: String, required: true },
    createdAt: { type: String, required: true }
});

const userSchema = new mongoose.Schema({
    name:           { type: String, required: true },
    email:          { type: String, required: true, unique: true },
    passwordHash:   { type: String, required: true },
    municipalityId: { type: String, required: true }, // now stores PSGC munCityCode

    // ── PSGC address fields ───────────────────────────────────────────────
    regionCode:     { type: String, default: '' },
    regionName:     { type: String, default: '' },
    provinceCode:   { type: String, default: '' },
    provinceName:   { type: String, default: '' },
    munCityCode:    { type: String, default: '' },
    munCityName:    { type: String, default: '' },
    barangayCode:   { type: String, default: '' },
    barangayName:   { type: String, default: '' },
    // ─────────────────────────────────────────────────────────────────────

    role:           { type: String, enum: ['fisher', 'municipal_admin', 'central_admin'], default: 'fisher' },
    status:         { type: String, enum: ['PENDING', 'APPROVED', 'DECLINED', 'DEACTIVATED'], default: 'PENDING' },
    birthdate:      { type: String },
    createdAt:      { type: String, required: true }
});

const boatSchema = new mongoose.Schema({
    userId:             { type: String, required: true, unique: true }, // enforces 1:1
    municipalityId:     { type: String, required: true },
    boatName:           { type: String, required: true },
    boatType:           { type: String, required: true },
    length:             { type: Number },
    enginePower:        { type: String },
    registrationNumber: { type: String }
});

const sessionSchema = new mongoose.Schema({
    localId:        { type: Number, default: null },
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
    localId:        { type: Number, default: null },
    sessionId:      { type: String, required: true },
    userId:         { type: String, required: true },
    boatId:         { type: String, default: '' },
    municipalityId: { type: String, required: true },
    fishSpecies:    { type: String, required: true },
    gear:           { type: String, required: true },
    totalWeight:    { type: Number, required: true },
    createdAt:      { type: String, required: false },
    imageUrl:       { type: String, default: '' }
});

const reportSchema = new mongoose.Schema({
    localId:        { type: Number, default: null },
    sessionId:      { type: String, required: true },
    userId:         { type: String, required: true },
    municipalityId: { type: String, required: true },
    latitude:       { type: Number, required: true },
    longitude:      { type: Number, required: true },
    timestamp:      { type: String, required: true },
    violator:       { type: String, default: '' },
    violation:      { type: String, required: true },
    fishingGear:    { type: String, required: true },
    fishingVessel:  { type: String, required: true },
    origin:         { type: String, required: true },
    imageUrl:       { type: String, default: '' }
});

const Municipality = mongoose.model('Municipality', municipalitySchema);
const User         = mongoose.model('User', userSchema);
const Boat         = mongoose.model('Boat', boatSchema);
const Session      = mongoose.model('Session', sessionSchema);
const Location     = mongoose.model('Location', locationSchema);
const Fishing      = mongoose.model('Fishing', fishingSchema);
const Report       = mongoose.model('Report', reportSchema);

// ── Image storage via Cloudinary ──────────────────────────────────────────────

// ── Middleware ────────────────────────────────────────────────────────────────

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).send({ message: 'No token provided.' });
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).send({ message: 'Unauthorized.' });
        req.userId = decoded.id;
        next();
    });
};

const verifyAdminToken = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).send({ message: 'No token provided.' });
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(401).send({ message: 'Unauthorized.' });
        const user = await User.findById(decoded.id);
        if (!user) return res.status(404).send({ message: 'User not found.' });
        if (user.role === 'fisher')
            return res.status(403).send({ message: 'Access denied. Admins only.' });
        req.userId             = decoded.id;
        req.userRole           = user.role;
        req.userMunicipalityId = user.municipalityId;
        next();
    });
};

const verifyCentralAdmin = async (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).send({ message: 'No token provided.' });
    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
        if (err) return res.status(401).send({ message: 'Unauthorized.' });
        const user = await User.findById(decoded.id);
        if (!user || user.role !== 'central_admin')
            return res.status(403).send({ message: 'Central admin access required.' });
        req.userId   = decoded.id;
        req.userRole = user.role;
        next();
    });
};

// ── Auth ──────────────────────────────────────────────────────────────────────

// POST /api/auth/signup
// Fisher submits their details + boat details together
// Account starts as PENDING until admin approves
exports.signup = async (req, res) => {
    try {
        const existing = await User.findOne({ email: req.body.email });
        if (existing) return res.status(400).send({ message: 'Email already in use.' });

        const passwordHash = await bcrypt.hash(req.body.password, 10);

        const user = await new User({
            name:           req.body.name,
            email:          req.body.email,
            passwordHash,
            municipalityId: req.body.municipalityId,
            role:           'fisher',
            status:         'PENDING',

            // ── PSGC fields ───────────────────────────────────────────────────────
            regionCode:     req.body.regionCode   || '',
            regionName:     req.body.regionName   || '',
            provinceCode:   req.body.provinceCode || '',
            provinceName:   req.body.provinceName || '',
            munCityCode:    req.body.munCityCode   || '',
            munCityName:    req.body.munCityName   || '',
            barangayCode:   req.body.barangayCode || '',
            barangayName:   req.body.barangayName || '',
            // ─────────────────────────────────────────────────────────────────────

            birthdate:      req.body.birthdate    || '',
            createdAt:      new Date().toISOString()
        }).save();

        // Save boat details alongside user — admin reviews both together
        await new Boat({
            userId:             user._id.toString(),
            municipalityId:     req.body.municipalityId,
            boatName:           req.body.boatName,
            boatType:           req.body.boatType,
            length:             req.body.length || 0,
            enginePower:        req.body.enginePower || '',
            registrationNumber: req.body.registrationNumber || ''
        }).save();

        console.log('New registration pending approval:', user.email);
        res.status(200).send({
            message: 'Registration submitted. Please wait for admin approval before logging in.'
        });
    } catch (err) {
        console.error('Signup error:', err.message);
        res.status(500).send({ message: err.message });
    }
};

// POST /api/auth/login
// Blocks PENDING and DECLINED users from logging in
exports.login = async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        console.log('Login attempt for:', req.body.email); // add this
        if (!user) return res.status(404).send({ message: 'User not found.' });

        const valid = await bcrypt.compare(req.body.password, user.passwordHash);
        if (!valid) return res.status(401).send({ message: 'Invalid password.' });

        // Admins bypass status check — they are always APPROVED
        if (user.role === 'fisher') {
            if (user.status === 'PENDING')
                return res.status(403).send({
                    message: 'Your account is pending approval. Please wait for an admin to approve your registration.'
                });
            if (user.status === 'DECLINED')
                return res.status(403).send({
                    message: 'Your registration has been declined. Please contact your municipality admin.'
                });
            if (user.status === 'DEACTIVATED')
                return res.status(403).send({
                    message: 'Your account has been deactivated. Please contact your municipality admin.'
                });
        }

        const boat  = await Boat.findOne({ userId: user._id.toString() });
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: 86400 });

        res.status(200).send({
            token,
            userId:         user._id.toString(),
            boatId:         boat ? boat._id.toString() : '',
            municipalityId: user.municipalityId,
            role:           user.role,
            status:         user.status,
            name:           user.name
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).send({ message: err.message });
    }
};

// POST /api/auth/admin-setup
exports.adminSetup = async (req, res) => {
    try {
        const existing = await User.findOne({ email: req.body.email });
        if (existing) return res.status(400).send({ message: 'Already exists.' });

        const role = req.body.role;
        if (!['municipal_admin', 'central_admin'].includes(role))
            return res.status(400).send({ message: 'Invalid role.' });

        const passwordHash = await bcrypt.hash(req.body.password, 10);
        const user = await new User({
            name:           req.body.name,
            email:          req.body.email,
            passwordHash,
            municipalityId: req.body.municipalityId || 'M001',
            role,
            status:         'APPROVED',
            address:        '',
            birthdate:      '',
            regionCode:     req.body.regionCode   || '',
            regionName:     req.body.regionName   || '',
            provinceCode:   req.body.provinceCode || '',
            provinceName:   req.body.provinceName || '',
            munCityCode:    req.body.munCityCode  || '',
            munCityName:    req.body.munCityName  || '',
            barangayCode:   req.body.barangayCode || '',
            barangayName:   req.body.barangayName || '',
            createdAt:      new Date().toISOString()
        }).save();

        res.status(200).send({ message: `${role} created.`, userId: user._id });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// POST /api/auth/fisher-setup  — admin creates a fisher directly as APPROVED
exports.fisherSetup = [verifyAdminToken, async (req, res) => {
    try {
        const existing = await User.findOne({ email: req.body.email });
        if (existing) return res.status(400).send({ message: 'Email already in use.' });

        const passwordHash = await bcrypt.hash(req.body.password, 10);
        const user = await new User({
            name:           req.body.name,
            email:          req.body.email,
            passwordHash,
            municipalityId: req.body.municipalityId || req.userMunicipalityId,
            role:           'fisher',
            status:         'APPROVED',
            birthdate:      req.body.birthdate || '',
            regionCode:     req.body.regionCode   || '',
            regionName:     req.body.regionName   || '',
            provinceCode:   req.body.provinceCode || '',
            provinceName:   req.body.provinceName || '',
            munCityCode:    req.body.munCityCode  || '',
            munCityName:    req.body.munCityName  || '',
            barangayCode:   req.body.barangayCode || '',
            barangayName:   req.body.barangayName || '',
            createdAt:      new Date().toISOString()
        }).save();

        if (req.body.boatName) {
            await new Boat({
                userId:             user._id.toString(),
                municipalityId:     req.body.municipalityId || req.userMunicipalityId,
                boatName:           req.body.boatName,
                boatType:           req.body.boatType || 'Motorized',
                length:             req.body.length || 0,
                enginePower:        req.body.enginePower || '',
                registrationNumber: req.body.registrationNumber || ''
            }).save();
        }

        res.status(200).send({ message: 'Fisher account created.', userId: user._id });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// ── Mobile sync endpoints ─────────────────────────────────────────────────────

exports.createSession = [verifyToken, async (req, res) => {
    try {
        if (req.body.localId != null) {
            const existing = await Session.findOne({ userId: req.body.userId, localId: req.body.localId });
            if (existing) return res.status(200).send({ id: existing._id.toString() });
        }
        const session = await new Session({
            ...req.body,
            createdAt: req.body.createdAt || new Date().toISOString()
        }).save();
        console.log('Session saved:', session._id);
        res.status(200).send({ id: session._id.toString() });
    } catch (err) {
        console.error('Session error:', err.message);
        res.status(500).send({ message: err.message });
    }
}];

exports.getSessions = [verifyToken, async (req, res) => {
    try {
        const sessions = await Session.find({ userId: req.params.userId });
        res.status(200).send(sessions);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

exports.createFishing = [verifyToken, async (req, res) => {
    try {
        if (req.body.localId != null) {
            const existing = await Fishing.findOne({ userId: req.body.userId, localId: req.body.localId });
            if (existing) return res.status(200).send({ id: existing._id.toString() });
        }
        let imageUrl = req.body.imageUrl || '';
        if (req.body.imageBinary) {
            try {
                const result = await uploadToCloudinary(
                    Buffer.from(req.body.imageBinary, 'base64'), 'bantaylaot/fishing'
                );
                imageUrl = result.secure_url;
            } catch (err) {
                console.error('Cloudinary fishing upload failed:', err.message);
            }
        }
        const record = await new Fishing({
            ...req.body,
            imageUrl,
            createdAt: req.body.createdAt || new Date().toISOString()
        }).save();
        console.log('Fishing saved:', record._id);
        res.status(200).send({ id: record._id.toString() });
    } catch (err) {
        console.error('Fishing error:', err.message);
        res.status(500).send({ message: err.message });
    }
}];

exports.getFishing = [verifyToken, async (req, res) => {
    try {
        const records = await Fishing.find({ userId: req.params.userId });
        res.status(200).send(records);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

exports.createReport = [verifyToken, async (req, res) => {
    try {
        if (req.body.localId != null) {
            const existing = await Report.findOne({ userId: req.body.userId, localId: req.body.localId });
            if (existing) return res.status(200).send({ id: existing._id.toString() });
        }
        const [origin, cloudResult] = await Promise.all([
            reverseGeocode(req.body.latitude, req.body.longitude)
                .then(r => r || req.body.origin || '')
                .catch(() => req.body.origin || ''),
            req.body.imageBinary
                ? uploadToCloudinary(
                    Buffer.from(req.body.imageBinary, 'base64'), 'bantaylaot/reports'
                  ).catch(err => { console.error('Cloudinary report upload failed:', err.message); return null; })
                : Promise.resolve(null)
        ]);
        const report = await new Report({
            ...req.body,
            imageUrl: cloudResult?.secure_url || req.body.imageUrl || '',
            origin
        }).save();
        console.log('Report saved:', report._id);
        res.status(200).send({ id: report._id.toString() });
    } catch (err) {
        console.error('Report error:', err.message);
        res.status(500).send({ message: err.message });
    }
}];

exports.getReports = [verifyAdminToken, async (req, res) => {
    try {
        const filter = req.userRole === 'central_admin'
            ? {}
            : { municipalityId: req.userMunicipalityId };
        const reports = await Report.find(filter).sort({ timestamp: -1 });
        res.status(200).send(reports);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

exports.createLocation = [verifyToken, async (req, res) => {
    try {
        const location = await new Location(req.body).save();
        res.status(200).send({ id: location._id.toString() });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// ── Web dashboard ─────────────────────────────────────────────────────────────

exports.getDashboardData = [verifyAdminToken, async (req, res) => {
    try {
        const filter = req.userRole === 'central_admin'
            ? {}
            : { municipalityId: req.userMunicipalityId };

        const sessions = await Session.find(filter).lean();
        console.log(`Dashboard: ${sessions.length} sessions for ${req.userRole}`);

        const userIds = [...new Set(sessions.map(s => s.userId))];
        const users   = await User.find({ _id: { $in: userIds } }).lean();
        const boats   = await Boat.find({ userId: { $in: userIds } }).lean();

        const enriched = await Promise.all(sessions.map(async (session) => {
            const sid = session._id.toString();
            const [locations, fishings, reports] = await Promise.all([
                Location.find({ sessionId: sid }).lean(),
                Fishing.find({ sessionId: sid }).lean(),
                Report.find({ sessionId: sid }).lean()
            ]);
            const owner = users.find(u => u._id.toString() === session.userId);
            const boat  = boats.find(b => b.userId === session.userId);
            console.log(`Session ${sid}: ${locations.length} loc, ${fishings.length} fish, ${reports.length} rep`);
            return { session, locations, fishings, reports, user: owner, boat };
        }));

        res.status(200).send(enriched);
    } catch (err) {
        console.error('Dashboard error:', err.message);
        res.status(500).send({ message: err.message });
    }
}];

// ── User management ───────────────────────────────────────────────────────────

// GET /api/users
// municipal_admin sees all fishers in their municipality (PENDING, APPROVED, DECLINED)
// central_admin sees all users
exports.getUsers = [verifyAdminToken, async (req, res) => {
    try {
        const filter = req.userRole === 'central_admin'
            ? { role: { $in: ['fisher', 'municipal_admin'] } }
            : { role: { $in: ['fisher', 'municipal_admin'] }, municipalityId: req.userMunicipalityId };

        const users = await User.find(filter).select('-passwordHash').lean();

        // Attach boat details to each user for admin review
        const withBoats = await Promise.all(users.map(async (user) => {
            const boat = await Boat.findOne({ userId: user._id.toString() }).lean();
            return { ...user, boat };
        }));

        res.status(200).send(withBoats);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// PUT /api/users/:id/status — approve or decline a fisher registration
// municipal_admin can approve/decline fishers in their municipality
// central_admin can approve/decline anyone
exports.updateUserStatus = [verifyAdminToken, async (req, res) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).send({ message: 'User not found.' });

        const newStatus = req.body.status;
        if (!['APPROVED', 'DECLINED', 'DEACTIVATED'].includes(newStatus))
            return res.status(400).send({ message: 'Status must be APPROVED, DECLINED, or DEACTIVATED.' });

        // municipal_admin can only update fishers in their municipality
        if (req.userRole === 'municipal_admin') {
            if (target.role !== 'fisher')
                return res.status(403).send({ message: 'You can only manage fisher accounts.' });
            if (target.municipalityId !== req.userMunicipalityId)
                return res.status(403).send({ message: 'User is not in your municipality.' });
        }

        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { status: newStatus } },
            { new: true }
        ).select('-passwordHash');

        console.log(`User ${target.email} status updated to ${newStatus} by ${req.userRole}`);
        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// PUT /api/users/:id — update user details
exports.updateUser = [verifyAdminToken, async (req, res) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).send({ message: 'User not found.' });

        if (req.userRole === 'municipal_admin') {
            if (target.role !== 'fisher')
                return res.status(403).send({ message: 'You can only manage fisher accounts.' });
            if (target.municipalityId !== req.userMunicipalityId)
                return res.status(403).send({ message: 'User is not in your municipality.' });
            delete req.body.role;
            delete req.body.status;  // use updateUserStatus endpoint for status changes
        }

        if (req.userRole === 'central_admin' && req.body.role === 'fisher')
            return res.status(400).send({ message: 'Cannot assign fisher role via admin panel.' });

        delete req.body.passwordHash;
        delete req.body.password;

        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        ).select('-passwordHash');

        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// DELETE /api/users/:id
exports.deleteUser = [verifyAdminToken, async (req, res) => {
    try {
        const target = await User.findById(req.params.id);
        if (!target) return res.status(404).send({ message: 'User not found.' });

        if (req.userRole === 'municipal_admin') {
            if (target.role !== 'fisher')
                return res.status(403).send({ message: 'You can only delete fisher accounts.' });
            if (target.municipalityId !== req.userMunicipalityId)
                return res.status(403).send({ message: 'User is not in your municipality.' });
        }

        if (req.userRole === 'central_admin' && target.role === 'central_admin')
            return res.status(403).send({ message: 'Cannot delete another central admin.' });

        // Also delete the associated boat when deleting a fisher
        if (target.role === 'fisher') {
            await Boat.findOneAndDelete({ userId: target._id.toString() });
        }

        await User.findByIdAndDelete(req.params.id);
        res.status(200).send({ message: 'User deleted.' });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// ── Debug ─────────────────────────────────────────────────────────────────────

exports.debugCounts = async (req, res) => {
    try {
        const counts = {
            sessions:  await Session.countDocuments(),
            locations: await Location.countDocuments(),
            fishings:  await Fishing.countDocuments(),
            reports:   await Report.countDocuments(),
            users:     await User.countDocuments(),
            boats:     await Boat.countDocuments(),
            pending:   await User.countDocuments({ status: 'PENDING' })
        };
        console.log('DB counts:', counts);
        res.status(200).send(counts);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.debugMunicipality = async (req, res) => {
    const sessions = await Session.find({}).lean();
    const users    = await User.find({}).lean();
    res.send({
        sessionMunicipalityIds: [...new Set(sessions.map(s => s.municipalityId))],
        userMunicipalityIds:    users.map(u => ({
            email:          u.email,
            role:           u.role,
            status:         u.status,
            municipalityId: u.municipalityId
        }))
    });
};

// GET /api/auth/admin-exists
// Returns whether a municipal_admin exists for this municipality
exports.adminExists = async (req, res) => {
    try {
        const admin = await User.findOne({
            role:           'municipal_admin',
            municipalityId: MUNICIPALITY_ID
        });
        res.status(200).send({ exists: !!admin });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.homepage = (req, res) => res.send('BantayLaot API');

// PUT /api/internal/users/:id/status — called by central server only
exports.updateUserStatusInternal = async (req, res) => {
    try {
        const { status } = req.body;
        if (!['APPROVED', 'DECLINED', 'DEACTIVATED'].includes(status))
            return res.status(400).send({ message: 'Invalid status.' });
        const updated = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { status } },
            { new: true }
        ).select('-passwordHash');
        if (!updated) return res.status(404).send({ message: 'User not found.' });
        console.log(`User ${req.params.id} status set to ${status} by central server`);
        res.status(200).send(updated);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// GET /api/profile/:userId — fisher profile + stats (token required)
exports.getProfile = [verifyToken, async (req, res) => {
    try {
        const userId = req.params.userId;
        const user   = await User.findById(userId).select('-passwordHash');
        if (!user) return res.status(404).send({ message: 'User not found.' });

        const boat     = await Boat.findOne({ userId: userId.toString() });
        const sessions = await Session.find({ userId: userId.toString() });
        const fishings = await Fishing.find({ userId: userId.toString() });
        const reports  = await Report.find({ userId: userId.toString() });

        const species   = [...new Set(fishings.map(f => f.fishSpecies))].length;
        const catchKg   = fishings.reduce((sum, f) => sum + (f.totalWeight || 0), 0);

        res.status(200).send({
            name:               user.name,
            email:              user.email,
            municipalityId:     user.municipalityId,
            munCityName:        user.munCityName        || '',
            barangayName:       user.barangayName       || '',
            joinDate:           user.createdAt,
            birthdate:          user.birthdate          || '',
            boatName:           boat?.boatName          || '',
            boatType:           boat?.boatType          || '',
            length:             boat?.length            ?? null,
            enginePower:        boat?.enginePower       || '',
            registrationNumber: boat?.registrationNumber || '',
            stats: {
                trips:   sessions.length,
                species,
                catchKg: Math.round(catchKg),
                reports: reports.length
            }
        });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// ── Dashboard analytics endpoints ─────────────────────────────────────────────

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

// GET /api/sessions/recent-date — most recent date that has session data
exports.getRecentSessionDate = [verifyAdminToken, async (req, res) => {
    try {
        const session = await Session.findOne({}).sort({ startDateTime: -1 }).lean();
        const date    = session ? session.startDateTime.slice(0, 10) : null;
        res.status(200).send({ date });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/violations/recent-date — most recent date that has violation data
exports.getRecentViolationDate = [verifyAdminToken, async (req, res) => {
    try {
        const report = await Report.findOne({}).sort({ timestamp: -1 }).lean();
        const date   = report ? report.timestamp.slice(0, 10) : null;
        res.status(200).send({ date });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/summary/violations?month=&year=
exports.getSummaryViolations = [verifyAdminToken, async (req, res) => {
    try {
        const month = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year  = parseInt(req.query.year)  || new Date().getFullYear();
        const { start, end } = monthDateRange(month, year);

        const reports = await Report.find({ timestamp: { $gte: start, $lt: end } }).lean();

        const userIds = [...new Set(reports.map(r => r.userId))];
        const users   = await User.find({ _id: { $in: userIds } }).lean();
        const userMap = {};
        users.forEach(u => { userMap[u._id.toString()] = u; });

        const byBarangay = {};
        reports.forEach(r => {
            const barangay = userMap[r.userId]?.barangayName || 'Unknown';
            byBarangay[barangay] = (byBarangay[barangay] || 0) + 1;
        });

        const total = reports.length;
        const data  = Object.entries(byBarangay).map(([barangayName, count]) => ({
            barangayName, count,
            percentage: total > 0 ? +((count / total) * 100).toFixed(1) : 0
        }));

        const byType = {};
        reports.forEach(r => { byType[r.violation] = (byType[r.violation] || 0) + 1; });
        const violationTypes = Object.entries(byType)
            .map(([violation, count]) => ({ violation, count }))
            .sort((a, b) => b.count - a.count);

        const mapReports = reports.map(r => ({
            latitude:      r.latitude,
            longitude:     r.longitude,
            violation:     r.violation,
            violator:      r.violator,
            reporterName:  userMap[r.userId]?.name || '',
            barangayName:  userMap[r.userId]?.barangayName || '',
            fishingGear:   r.fishingGear || '',
            fishingVessel: r.fishingVessel || '',
            origin:        r.origin || '',
            imageUrl:      r.imageUrl || '',
            timestamp:     r.timestamp
        }));

        res.status(200).send({ total, data, violationTypes, mapReports });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/summary/cpue?month=&year=&barangay=
exports.getSummaryCPUE = [verifyAdminToken, async (req, res) => {
    try {
        const month    = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year     = parseInt(req.query.year)  || new Date().getFullYear();
        const barangay = req.query.barangay || '';
        const { start, end } = monthDateRange(month, year);

        const sessions = await Session.find({
            startDateTime: { $gte: start, $lt: end }
        }).lean();

        const userIds  = [...new Set(sessions.map(s => s.userId))];
        let users      = await User.find({ _id: { $in: userIds } }).lean();
        if (barangay)  users = users.filter(u => u.barangayName === barangay);

        const filteredUids = new Set(users.map(u => u._id.toString()));
        const filteredSessions = sessions.filter(s => filteredUids.has(s.userId));
        const sessionIds = filteredSessions.map(s => s._id.toString());

        const [allFishings, boats] = await Promise.all([
            Fishing.find({ sessionId: { $in: sessionIds } }).lean(),
            Boat.find({ userId: { $in: [...filteredUids] } }).lean()
        ]);

        const fishCatch = aggregateFishCatch(allFishings);
        const cpue      = computeCPUE(filteredSessions, allFishings);

        const usersList = users.map(user => {
            const uid          = user._id.toString();
            const userSessions = filteredSessions.filter(s => s.userId === uid);
            const sessionIds2  = userSessions.map(s => s._id.toString());
            const userFishings = allFishings.filter(f => sessionIds2.includes(f.sessionId));
            const boat         = boats.find(b => b.userId === uid);
            return {
                userId:       uid,
                name:         user.name,
                boatName:     boat?.boatName || '',
                barangayName: user.barangayName || '',
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

// GET /api/summary/sessions-map?month=&year=&barangay=
exports.getSummarySessionsMap = [verifyAdminToken, async (req, res) => {
    try {
        const month    = parseInt(req.query.month) || new Date().getMonth() + 1;
        const year     = parseInt(req.query.year)  || new Date().getFullYear();
        const barangay = req.query.barangay || '';
        const { start, end } = monthDateRange(month, year);

        let sessions = await Session.find({ startDateTime: { $gte: start, $lt: end } }).lean();

        const allUserIds = [...new Set(sessions.map(s => s.userId))];
        const allUsers   = await User.find({ _id: { $in: allUserIds } }, { barangayName: 1 }).lean();
        const userBrgy   = {};
        allUsers.forEach(u => { userBrgy[u._id.toString()] = u.barangayName || ''; });

        if (barangay) {
            sessions = sessions.filter(s => userBrgy[s.userId] === barangay);
        }

        const sessionIds = sessions.map(s => s._id.toString());
        const locations  = await Location.find({ sessionId: { $in: sessionIds } }).lean();

        const locBySession = {};
        locations.forEach(l => {
            if (!locBySession[l.sessionId]) locBySession[l.sessionId] = [];
            locBySession[l.sessionId].push(l);
        });

        const routes = sessions
            .map(s => ({
                sessionId:   s._id.toString(),
                barangayName: userBrgy[s.userId] || '',
                locations: (locBySession[s._id.toString()] || [])
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            }))
            .filter(r => r.locations.length >= 2);

        res.status(200).send({ routes });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/sessions/by-date?date=YYYY-MM-DD
exports.getSessionsByDate = [verifyAdminToken, async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).send({ message: 'date required' });
        const { start, end } = phDateRange(date);

        const sessions = await Session.find({ startDateTime: { $gte: start, $lt: end } }).lean();

        if (!sessions.length) return res.status(200).send({ fishCatch: [], cpue: {}, users: [] });

        const userIds    = [...new Set(sessions.map(s => s.userId))];
        const sessionIds = sessions.map(s => s._id.toString());

        const [users, boats, allFishings, allLocations] = await Promise.all([
            User.find({ _id: { $in: userIds } }).lean(),
            Boat.find({ userId: { $in: userIds } }).lean(),
            Fishing.find({ sessionId: { $in: sessionIds } }).lean(),
            Location.find({ sessionId: { $in: sessionIds } }).lean()
        ]);

        const fishCatch = aggregateFishCatch(allFishings);
        const cpue      = computeCPUE(sessions, allFishings);

        const sessionsByUser = {};
        sessions.forEach(s => {
            if (!sessionsByUser[s.userId]) sessionsByUser[s.userId] = [];
            sessionsByUser[s.userId].push(s);
        });

        const usersList = users.map(user => {
            const uid          = user._id.toString();
            const userSessions = sessionsByUser[uid] || [];
            const boat         = boats.find(b => b.userId === uid);
            const sessionsData = userSessions.map(s => {
                const sid = s._id.toString();
                return {
                    session:   s,
                    fishings:  allFishings.filter(f => f.sessionId === sid),
                    locations: allLocations.filter(l => l.sessionId === sid)
                };
            });
            return {
                userId:      uid,
                name:        user.name,
                boatName:    boat?.boatName || '',
                barangayName: user.barangayName || '',
                sessionCount: userSessions.length,
                sessions:    sessionsData
            };
        });

        res.status(200).send({ fishCatch, cpue, users: usersList });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];

// GET /api/violations/by-date?date=YYYY-MM-DD
exports.getViolationsByDate = [verifyAdminToken, async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).send({ message: 'date required' });
        const { start, end } = phDateRange(date);

        const reports = await Report.find({ timestamp: { $gte: start, $lt: end } }).lean();

        if (!reports.length) return res.status(200).send({ violationCounts: [], total: 0, users: [] });

        const userIds = [...new Set(reports.map(r => r.userId))];
        const [users, boats] = await Promise.all([
            User.find({ _id: { $in: userIds } }).lean(),
            Boat.find({ userId: { $in: userIds } }).lean()
        ]);

        const typeCounts = {};
        reports.forEach(r => {
            typeCounts[r.violation] = (typeCounts[r.violation] || 0) + 1;
        });
        const violationCounts = Object.entries(typeCounts).map(([violation, count]) => ({ violation, count }));

        const reportsByUser = {};
        reports.forEach(r => {
            if (!reportsByUser[r.userId]) reportsByUser[r.userId] = [];
            reportsByUser[r.userId].push(r);
        });

        const usersList = users.map(user => {
            const uid  = user._id.toString();
            const boat = boats.find(b => b.userId === uid);
            return {
                userId:      uid,
                name:        user.name,
                boatName:    boat?.boatName || '',
                barangayName: user.barangayName || '',
                reportCount: (reportsByUser[uid] || []).length,
                reports:     reportsByUser[uid] || []
            };
        });

        res.status(200).send({ violationCounts, total: reports.length, users: usersList });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
}];