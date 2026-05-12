const express = require('express');
const router = express.Router();
const userController = require('./userController');

router.get('/:id', userController.getUser);

module.exports = router;
