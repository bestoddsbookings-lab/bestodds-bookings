const express = require('express');
const router = express.Router();
const bookingController = require('./bookingController');

router.get('/my-codes/:userId', bookingController.getMyCodes);

module.exports = router;
