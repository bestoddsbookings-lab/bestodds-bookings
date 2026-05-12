const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const oddsRoutes = require('./routes/oddsRoutes');
const apiRoutes = require('./routes/index');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const path = require('path');
const fs = require('fs');

// serve uploads directory so uploaded files are accessible
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve the uploaded favicon at the root path so browsers will pick it up
// even if the HTML is cached or missing the link tag. Falls back to PNG.
app.get('/favicon.ico', (req, res) => {
    const faviconPath = path.join(__dirname, '../uploads/BestOdds_favicon.png');
    return res.sendFile(faviconPath, (err) => {
        if (err) {
            console.error('Failed to send favicon:', err);
            res.status(404).end();
        }
    });
});

// Routes
app.use('/api/odds', oddsRoutes);
app.use('/api', apiRoutes);

// Serve client build (supports both local dev layout and packaged build)
try {
    const clientBuildPathDev = path.resolve(__dirname, '../../client/build');
    const clientBuildPathProd = path.resolve(__dirname, '../build');
    let serveClientPath = null;
    if (fs.existsSync(clientBuildPathDev)) serveClientPath = clientBuildPathDev;
    else if (fs.existsSync(clientBuildPathProd)) serveClientPath = clientBuildPathProd;

    if (serveClientPath) {
        app.use(express.static(serveClientPath));
        // Serve index.html for any non-API route
        app.get('*', (req, res, next) => {
            if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/favicon.ico') return next();
            res.sendFile(path.join(serveClientPath, 'index.html'));
        });
        console.log('Serving client from', serveClientPath);
    }
} catch (e) {
    console.error('Error while configuring client static serving', e);
}

// Global error handler (captures multer and other errors)
app.use((err, req, res, next) => {
    console.error('Global error handler:', err && err.stack ? err.stack : err);
    try {
        if (err && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large' });
        if (err && err.message && err.message.includes('Only image files are allowed')) return res.status(400).json({ error: err.message });
    } catch (e) {
        console.error('Error in global error handler', e);
    }
    return res.status(500).json({ error: err?.message || 'Server error' });
});

// Start the server using native http so we can attach WebSocket server
const http = require('http');
const server = http.createServer(app);

// initialize websocket server
try {
    const ws = require('./ws');
    ws.init(server);
} catch (e) {
    console.error('Failed to initialize websocket server', e);
}

// Periodic sweep: clear expired booking codes stored in file-backed submissions
const fs = require('fs');
function sweepExpiredBookingCodes() {
    try {
        const submissionsDir = path.resolve(__dirname, '../uploads/submissions');
        if (!fs.existsSync(submissionsDir)) return;
        const files = fs.readdirSync(submissionsDir).filter(f => f.endsWith('.json'));
        for (const file of files) {
            try {
                const full = path.join(submissionsDir, file);
                const raw = fs.readFileSync(full, 'utf8');
                const s = JSON.parse(raw);
                if (s && s.bookingCode && s.codeOpenedAt) {
                    const opened = new Date(s.codeOpenedAt);
                    const duration = Number.isFinite(Number(s.codeDurationHours)) ? Number(s.codeDurationHours) : Number(process.env.DEFAULT_CODE_DURATION_HOURS || 24);
                    const expiresAt = new Date(opened.getTime() + duration * 3600 * 1000);
                    if (new Date() > expiresAt) {
                        // clear booking fields
                        delete s.bookingCode;
                        s.codeOpenedAt = null;
                        s.codeIssuedAt = null;
                        s.codeDurationHours = null;
                        fs.writeFileSync(full, JSON.stringify(s, null, 2), 'utf8');
                        try {
                            const ws = require('./ws');
                            ws.broadcast({ type: 'booking_code_expired', submissionId: s.id, userId: s.userId });
                        } catch (e) { /* ignore */ }
                    }
                }
            } catch (e) {
                // ignore per-file errors
            }
        }
    } catch (e) {
        console.error('sweepExpiredBookingCodes error', e);
    }
}

// run sweep on startup and then every minute
sweepExpiredBookingCodes();
setInterval(sweepExpiredBookingCodes, 60 * 1000);

server.listen(PORT, () => {
    logger.info(`Server is running on http://localhost:${PORT}`);
});