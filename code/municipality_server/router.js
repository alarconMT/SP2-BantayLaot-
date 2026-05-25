const controller = require('./controller');

module.exports = (app) => {

    // Auth
    app.post('/api/auth/signup',      controller.signup);
    app.post('/api/auth/login',       controller.login);
    app.get('/api/auth/admin-exists', controller.adminExists);
    app.post('/api/auth/admin-setup',  controller.adminSetup);
    app.post('/api/auth/fisher-setup', controller.fisherSetup);

    // Analytics — must be defined BEFORE parameterised routes to avoid :userId matching "by-date"
    app.get('/api/sessions/recent-date',   controller.getRecentSessionDate);
    app.get('/api/sessions/by-date',       controller.getSessionsByDate);
    app.get('/api/violations/recent-date', controller.getRecentViolationDate);
    app.get('/api/violations/by-date',     controller.getViolationsByDate);
    app.get('/api/summary/violations',     controller.getSummaryViolations);
    app.get('/api/summary/cpue',           controller.getSummaryCPUE);
    app.get('/api/summary/sessions-map',   controller.getSummarySessionsMap);

    // Fisher profile
    app.get('/api/profile/:userId',   controller.getProfile);

    // Mobile sync (fisher)
    app.post('/api/sessions',         controller.createSession);
    app.get( '/api/sessions/:userId', controller.getSessions);
    app.post('/api/fishing',          controller.createFishing);
    app.get( '/api/fishing/:userId',  controller.getFishing);
    app.post('/api/reports',          controller.createReport);
    app.post('/api/locations',        controller.createLocation);

    // Web dashboard
    app.get('/api/dashboard/sessions', controller.getDashboardData);

    // User management
    app.get(   '/api/users',                       controller.getUsers);
    app.put(   '/api/users/:id',                   controller.updateUser);
    app.put(   '/api/users/:id/status',            controller.updateUserStatus);
    app.delete('/api/users/:id',                   controller.deleteUser);

    // Internal — called by central server only
    app.put('/api/internal/users/:id/status', controller.updateUserStatusInternal);

    // Reports (admin)
    app.get('/api/reports', controller.getReports);

    // Debug
    app.get('/api/debug/counts',       controller.debugCounts);
    app.get('/api/debug/municipality', controller.debugMunicipality);

    app.get('/', controller.homepage);
};
