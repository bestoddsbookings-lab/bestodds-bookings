const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const assetCtrl = require('./assetController');
const adminAuth = require('../../middleware/admin');

// simple middleware to log incoming upload attempts
function logUploadAttempt(req, res, next) {
	try {
		console.log('asset upload attempt', { url: req.originalUrl, method: req.method, headers: { authorization: !!req.headers.authorization, 'x-admin-user': !!req.headers['x-admin-user'] }, contentLength: req.headers['content-length'] });
	} catch (e) { }
	next();
}

// Admin uploads an asset (logo, background, flyer) as multipart/form-data with field 'file' and body.type
router.post('/admin/assets/upload', logUploadAttempt, adminAuth, upload.single('file'), assetCtrl.uploadAsset);

// Public endpoint to get currently active assets
router.get('/assets/current', assetCtrl.getCurrent);

// Admin check helper to debug auth quickly
router.get('/admin/check', adminAuth, (req, res) => res.json({ ok: true }));

module.exports = router;
