const express = require('express');
const router = express.Router();
const { getGroupSummary } = require('../controllers/summaryController');

router.route('/:groupId')
    .get(getGroupSummary);

module.exports = router;
