const express = require('express');
const router = express.Router();

const sign = require('./sign');
const auth = require('./auth');
const email = require('./email');
const editPwd = require('./editPwd');

router.use('/sign', sign);
router.use('/auth', auth);
router.use('/email', email);
router.use('/editPwd', editPwd);

module.exports = router;