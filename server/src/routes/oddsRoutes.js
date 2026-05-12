const express = require('express');
const {
  createOdds,
  getOdds,
  updateOdds,
  deleteOdds,
} = require('../controllers/oddsController');

const router = express.Router();

router.post('/odds', createOdds);
router.get('/odds', getOdds);
router.put('/odds/:id', updateOdds);
router.delete('/odds/:id', deleteOdds);

module.exports = router;