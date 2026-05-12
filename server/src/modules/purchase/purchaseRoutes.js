const express = require('express');
const router = express.Router();
const purchaseCtrl = require('./purchaseController');
const auth = require('../../middleware/auth');
const adminAuth = require('../../middleware/admin');

// user creates a purchase (buy)
router.post('/create', auth, purchaseCtrl.createPurchase);

// user purchases listing
router.get('/my', auth, purchaseCtrl.getMyPurchases);

// admin routes
router.get('/', adminAuth, purchaseCtrl.getPurchases);
router.post('/approve/:id', adminAuth, purchaseCtrl.approvePurchase);
router.post('/reject/:id', adminAuth, purchaseCtrl.rejectPurchase);

module.exports = router;
