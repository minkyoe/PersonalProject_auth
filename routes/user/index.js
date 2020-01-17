const express = require('express');
const router = express.Router();

const all = require('./all');

router.use('/', all);

module.exports = router;