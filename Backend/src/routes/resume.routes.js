import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import resumeController from '../controllers/resume.controller.js';
import { protect, authorize, ensureOwnProfile } from '../middleware/auth.middleware.js';

const router = express.Router();

const uploadDirectory = path.join(os.tmpdir(), 'intervix_resumes');
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
  '/me',
  authorize('candidate', 'admin'),
  ensureOwnProfile('candidate'),
  resumeController.deleteResume
);

router.get(
  '/me',
  authorize('candidate', 'admin'),
  ensureOwnProfile('candidate'),
  resumeController.getMyResume
);

router.get(
  '/me/analysis',
  authorize('candidate', 'admin'),
  ensureOwnProfile('candidate'),
  resumeController.getMyResumeAnalysis
);

router.get(
  '/me/download',
  authorize('candidate', 'admin'),
  ensureOwnProfile('candidate'),
  resumeController.downloadMyResume
);

router.get(
  '/:resumeId',
  authorize('candidate', 'recruiter', 'admin'),
  resumeController.getResumeById
);

router.get(
  '/:resumeId/analysis',
  authorize('candidate', 'recruiter', 'admin'),
  resumeController.getResumeAnalysisById
);

router.get(
  '/:resumeId/download',
  authorize('candidate', 'recruiter', 'admin'),
  resumeController.downloadResumeById
);

export default router;
