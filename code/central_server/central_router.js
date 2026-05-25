const controller = require('./central_controller');

module.exports = (app) => {
    app.get('/', controller.homepage);

    // Auth
    app.get('/api/auth/admin-exists',      controller.adminExists);
    app.post('/api/auth/admin-setup',      controller.adminSetup);
    app.post('/api/auth/researcher-setup', controller.researcherSetup);
    app.post('/api/auth/login',            controller.login);

    // Sync from municipality servers
    app.post('/api/sync/municipality', controller.receiveMunicipalitySync);

    // Dashboard (central_admin only)
    app.get('/api/dashboard/sessions', controller.getDashboardData);

    // User management (central_admin only)
    app.get(   '/api/users',            controller.getUsers);
    app.put(   '/api/users/:id',        controller.updateUser);
    app.put(   '/api/users/:id/status', controller.updateUserStatus);
    app.delete('/api/users/:id',        controller.deleteUser);

    // Reports (central_admin only)
    app.get('/api/reports', controller.getReports);

    // Analytics (central_admin only — uses verifyCentralAdmin which blocks researchers)
    app.get('/api/summary/violations',     controller.getSummaryViolations);
    app.get('/api/summary/cpue',           controller.getSummaryCPUE);
    app.get('/api/summary/sessions-map',   controller.getSummarySessionsMap);
    app.get('/api/sessions/recent-date',   controller.getRecentSessionDate);
    app.get('/api/sessions/by-date',       controller.getSessionsByDate);
    app.get('/api/violations/recent-date', controller.getRecentViolationDate);
    app.get('/api/violations/by-date',     controller.getViolationsByDate);

    // Researcher endpoints (anonymized — accessible by researcher + central_admin)
    app.get('/api/researcher/summary/violations',  controller.getResearcherSummaryViolations);
    app.get('/api/researcher/summary/cpue',        controller.getResearcherSummaryCPUE);
    app.get('/api/researcher/summary/sessions-map', controller.getResearcherSummarySessionsMap);
    app.get('/api/researcher/sessions/recent-date',   controller.getResearcherRecentSessionDate);
    app.get('/api/researcher/violations/recent-date', controller.getResearcherRecentViolationDate);
    app.get('/api/researcher/sessions/by-date',    controller.getResearcherSessionsByDate);
    app.get('/api/researcher/violations/by-date',  controller.getResearcherViolationsByDate);
    app.get('/api/researcher/user-stats',          controller.getResearcherUserStats);

    // Researcher account management (central_admin only)
    app.get(   '/api/researchers',            controller.getResearchers);
    app.put(   '/api/researchers/:id/status', controller.updateResearcherStatus);
    app.delete('/api/researchers/:id',        controller.deleteResearcher);

    // Debug
    app.get('/api/debug/counts', controller.getCounts);
};
