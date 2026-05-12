const express = require('express');
const router = express.Router();
const multer = require('multer');
const paymentController = require('./paymentController');

const upload = multer({ dest: 'uploads/' });

router.post('/submit', upload.single('screenshot'), paymentController.submitPayment);

module.exports = router;
