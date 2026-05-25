const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const resumeController = require('../controllers/resume.controller');
const { protect, authorize, ensureOwnProfile } = require('../middleware/auth.middleware');

const router = express.Router();

const uploadDirectory = path.join(__dirname, '../../uploads/resumes');
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `resume-${req.user._id}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only PDF and DOCX documents are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

router.use(protect);

router.post(
  '/upload',
  authorize('candidate', 'admin'),
  ensureOwnProfile('candidate'),
  upload.single('resume'),
  resumeController.uploadResume
);

router.delete(
  '/',
  authorize('candidate', 'admin'),
  ensureOwnProfile('candidate'),
  resumeController.deleteResume
);

router.get(
  '/preview',
  authorize('candidate', 'recruiter', 'admin'),
  resumeController.previewResume
);

module.exports = router;
