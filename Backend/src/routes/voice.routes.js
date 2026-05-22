const express = require('express');
const multer = require('multer');
const voiceController = require('../controllers/voice.controller');
const { protect } = require('../middleware/auth.middleware');
const fs = require('fs');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/temp';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

router.use(protect);

router.post('/transcribe', upload.single('audio'), voiceController.transcribeAudio);
router.post('/speak', voiceController.generateSpeech);
router.post('/respond', upload.single('audio'), voiceController.processVoiceResponse);

module.exports = router;
