const express = require('express');
const router = express.Router();
const offerController = require('./offerController');
const adminMiddleware = require('../../middleware/admin');

router.get('/offers', offerController.listOffers);
router.post('/offers', adminMiddleware, offerController.createOffer);
router.delete('/offers/:id', adminMiddleware, offerController.deleteOffer);

module.exports = router;
