const express = require('express');
const router = express.Router();
const adminController = require('./adminController');

router.get('/payments/pending', adminController.listPendingPayments);
router.post('/payments/:id/approve', adminController.approvePayment);
router.post('/booking-codes', adminController.createBookingCode);

module.exports = router;
