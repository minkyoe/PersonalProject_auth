const express = require('express');
const router = express.Router();

const main = require('./main/index');
const user = require('./user/index');
const test = require('./test/index');

router.use('/main', main);
router.use('/user', user);
router.use('/test', test);

module.exports = router;