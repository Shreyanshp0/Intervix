const express = require('express');
const multer = require('multer');
const voiceController = require('../controllers/voice.controller');
const { protect } = require('../middleware/auth.middleware');
const fs = require('fs');
const ApiError = require('../utils/api-error');
const { isSupportedAudioMimeType, MAX_AUDIO_FILE_SIZE } = require('../utils/audio-utils');

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
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_AUDIO_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (!isSupportedAudioMimeType(file.mimetype)) {
      return cb(new ApiError(415, 'Unsupported audio mime type'));
    }
    return cb(null, true);
  },
});

router.use(protect);

router.post('/transcribe', upload.single('audio'), voiceController.transcribeAudio);
router.post('/speak', voiceController.generateSpeech);
router.post('/respond', upload.single('audio'), voiceController.processVoiceResponse);

router.use((err, req, res, next) => {
  if (!err) {
    return next();
  }

  const statusCode = err.statusCode || 400;
  return res.status(statusCode).json({
    success: false,
    stage: 'upload_received',
    error: err.message || 'Upload failed',
  });
});

module.exports = router;
