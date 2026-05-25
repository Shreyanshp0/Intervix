const express = require('express');
const codeController = require('../controllers/code.controller');
const roomController = require('../controllers/room.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Enforce auth middleware for all collaborative coding routes
router.use(protect);

router.post('/run', codeController.runCode);
router.post('/room', roomController.createRoom);
router.get('/room/:roomId', roomController.validateRoom);

module.exports = router;
