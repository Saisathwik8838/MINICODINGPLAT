const express = require('express');
const { submitCode } = require('../controllers/codeController');

const router = express.Router();

router.post('/execute', submitCode);

module.exports = router;
