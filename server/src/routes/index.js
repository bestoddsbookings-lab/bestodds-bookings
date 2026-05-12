const express = require("express");
const router = express.Router();

const auth = require("../controllers/auth.controller");
const payment = require("../controllers/payment.controller");
const admin = require("../controllers/admin.controller");
const booking = require("../controllers/booking.controller");
const emailService = require("../modules/email/emailService");
const uuidv4 = require('uuidv4');
const offerRoutes = require('../modules/offer/offerRoutes');
const purchaseRoutes = require('../modules/purchase/purchaseRoutes');
const assetRoutes = require('../modules/assets/assetRoutes');

const authMiddleware = require("../middleware/auth");
const adminMiddleware = require("../middleware/admin");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directories exist
const uploadsRoot = path.resolve(__dirname, '../../uploads');
const paymentsDir = path.resolve(uploadsRoot, 'payments');
const newCodesDir = path.resolve(uploadsRoot, 'new_codes');
fs.mkdirSync(paymentsDir, { recursive: true });
fs.mkdirSync(newCodesDir, { recursive: true });

// Multer instance for general uploads (assets)
const upload = multer({ dest: uploadsRoot });

// Multer instance specifically for payment proof uploads with limits and image-only filter
const uploadPayment = multer({
	dest: paymentsDir,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
	fileFilter: (req, file, cb) => {
		if (!file.mimetype || !file.mimetype.startsWith('image/')) {
			return cb(new Error('Only image files are allowed'));
		}
		cb(null, true);
	},
});

// AUTH
router.post("/auth/register", auth.register);
router.get("/auth/verify", auth.verify);
router.post("/auth/resend", auth.resend);
router.post("/auth/login", auth.login);
router.get('/auth/me', authMiddleware, auth.me);
router.put('/auth/me', authMiddleware, auth.updateMe);

// PAYMENT
router.post("/payments/submit", uploadPayment.single('file'), authMiddleware, payment.submitPayment);

// Settings endpoints for payment info (admin + public)
const settings = require('../modules/settings/settingsController');
router.get('/admin/settings/payment', adminMiddleware, settings.getPaymentInfo);
router.post('/admin/settings/payment', adminMiddleware, settings.setPaymentInfo);
router.get('/payment-info', settings.getPaymentInfoPublic);
router.get('/admin/settings/support', adminMiddleware, settings.getSupportInfo);
router.post('/admin/settings/support', adminMiddleware, settings.setSupportInfo);
router.get('/support-info', settings.getSupportInfoPublic);

// ADMIN
router.get("/admin/payments", adminMiddleware, admin.getPayments);
router.get("/admin/users", adminMiddleware, admin.getUsers);
router.post('/admin/login', admin.adminLogin);
router.post('/admin/user/:id/ban', adminMiddleware, admin.banUser);
router.post('/admin/user/:id/unban', adminMiddleware, admin.unbanUser);
router.post('/admin/user/:id/new-code', adminMiddleware, admin.createUserNewCode);
router.delete('/admin/user/:id/new-code', adminMiddleware, admin.deleteUserNewCode);
router.delete('/admin/user/:id', adminMiddleware, admin.deleteUser);
router.post('/admin/user', adminMiddleware, admin.createUser);
router.put('/admin/user/:id', adminMiddleware, admin.editUser);
router.post('/admin/user/:id/resend', adminMiddleware, admin.resendVerification);
router.get('/admin/users/export', adminMiddleware, admin.exportUsersCsv);
router.post("/admin/approve/:paymentId", adminMiddleware, admin.approve);
router.post("/admin/reject/:paymentId", adminMiddleware, admin.reject);
router.post('/admin/submission/:id', adminMiddleware, admin.updateSubmission);
router.get('/admin/submission/:id', adminMiddleware, admin.getSubmission);
router.post('/admin/submission/:id/code', adminMiddleware, admin.setBookingCode);
router.delete('/admin/submission/:id', adminMiddleware, admin.deleteSubmission);

// return any admin-created 'New Code Arrival' for the authenticated user
router.get('/booking/new-arrival', authMiddleware, booking.getNewArrival);
router.delete('/booking/new-arrival', authMiddleware, booking.deleteNewArrival);

// BOOKING
router.post("/booking/create", adminMiddleware, booking.create);
router.post("/booking/assign", adminMiddleware, booking.assign);
router.get("/booking/my-code", authMiddleware, booking.myCode);

// OFFERS
router.use('/', offerRoutes);
// PURCHASES
router.use('/purchases', purchaseRoutes);
// ASSETS
router.use('/', assetRoutes);

module.exports = router;

// Test email endpoint (POST /api/email/test) - body: { to: 'recipient@example.com' }
router.post('/email/test', async (req, res) => {
	try {
		const { to } = req.body;
		if (!to) return res.status(400).json({ message: 'missing_to' });
		const token = uuidv4();
		await emailService.sendVerificationEmail(to, token);
		return res.json({ message: 'sent' });
	} catch (err) {
		console.error('Email test failed', err);
		return res.status(500).json({ message: 'send_failed', error: err.message });
	}
});
