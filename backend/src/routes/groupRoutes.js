const express = require('express');
const router = express.Router();
const { createGroup, getGroup } = require('../controllers/groupController');
// const { protect } = require('../middleware/authMiddleware'); // Commmented out to allow public access for frontend compatibility

router.route('/')
    .post(createGroup); // removed protect middleware

router.route('/:id')
    .get(getGroup); // removed protect middleware

module.exports = router;
