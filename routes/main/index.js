const express = require('express');
const router = express.Router();

const sign = require('./sign');
const login = require('./login');
const auth = require('./auth');
const findPwd = require('./findPwd');

router.use('/sign', sign);
router.use('/login', login);
router.use('/auth', auth);
router.use('/findPwd', findPwd);

module.exports = router;