import { useState, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Trash2, RefreshCw, Star, Shield, Sparkles } from 'lucide-react';
import api from '../../services/api';
import Button from '../common/Button';
import { API_ROUTES } from '../../constants/apiRoutes';
import EmptyState from '../common/EmptyState';
import { safeArray, safeObject } from '../../utils/safety';

export const ResumeUpload = ({ onUploadSuccess }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | parsing | success | error
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resumeData, setResumeData] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchActiveResume = async () => {
      try {
        const response = await api.get(API_ROUTES.resume.me);
        const nextResponse = safeObject(response.data, 'resume lookup response');
        if (isMounted && nextResponse.resume) {
          setErrorMessage('');
          setStatusMessage('');
          setResumeData(safeObject(nextResponse.resume, 'resume payload'));
          setUploadState('success');
        } else if (isMounted) {
          setResumeData(null);
          setUploadState('idle');
        }
      } catch {
        if (isMounted) {
          setResumeData(null);
          setUploadState('idle');
        }
      }
    };

    void fetchActiveResume();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDrag = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      void handleFileUpload(event.dataTransfer.files[0]);
    }
  };

  const handleChange = (event) => {
    event.preventDefault();
    if (event.target.files && event.target.files[0]) {
      void handleFileUpload(event.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadState('error');
      setErrorMessage('Invalid file format. Please upload a PDF or DOCX file.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadState('error');
      setErrorMessage('File size exceeds the 10MB limit.');
      return;
    }

    setUploadState('uploading');
    setProgress(20);
    setStatusMessage('Uploading document to secure storage...');
    setErrorMessage('');

    const formData = new FormData();
    formData.append('resume', file);

    try {
      // Simulate progress ticks
      const progressInterval = setInterval(() => {
        setProgress((current) => {
          if (current >= 90) {
            clearInterval(progressInterval);
            return current;
          }
          return current + 15;
        });
      }, 800);

      const response = await api.post(API_ROUTES.resume.upload, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(progressInterval);
      setProgress(100);
      setUploadState('parsing');
      setStatusMessage('Extracting text and executing AI Resume Intelligence parsing...');

      // Let AI parsing screen breathe for 1.2s
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setResumeData(safeObject(response.data?.resume, 'uploaded resume'));
      setUploadState('success');
      if (onUploadSuccess) {
        onUploadSuccess(safeObject(response.data?.profile, 'candidate profile after upload'));
      }
    } catch (error) {
      setUploadState('error');
      setErrorMessage(error.response?.data?.message || 'Resume upload or AI analysis failed.');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete your uploaded resume?')) {
      return;
    }

    setUploadState('uploading');
    setStatusMessage('Deleting resume and cleaning up storage...');
    try {
      await api.delete(API_ROUTES.resume.me);
      setResumeData(null);
      setUploadState('idle');
      if (onUploadSuccess) {
        onUploadSuccess(null);
      }
    } catch (error) {
      setUploadState('error');
      setErrorMessage(error.response?.data?.message || 'Failed to delete resume.');
    }
  };

  return (
    <div className="glass-card rounded-[28px] p-6 lg:p-8 space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/15 text-cyan-200">
          <UploadCloud size={22} />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">AI Resume Intelligence</h2>
          <p className="mt-1 text-sm text-gray-400">Upload your CV to auto-fill your profile, calculate ATS scores, and configure resume-aware interviews.</p>
        </div>
      </div>

      {uploadState === 'idle' && (
        <div className="space-y-4">
          <EmptyState
            title="No resume uploaded yet"
            description="Upload your resume to unlock personalized AI interviews, ATS scoring, and recruiter-ready matching."
          />
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-3xl p-10 text-center flex flex-col items-center justify-center transition-all ${
              dragActive ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-white/10 hover:border-white/20 bg-white/5'
            }`}
          >
            <input
              type="file"
              id="resume-file-input"
              className="hidden"
              accept=".pdf,.docx,.doc"
              onChange={handleChange}
            />
            <UploadCloud size={48} className="text-gray-400 mb-4 animate-bounce" />
            <p className="text-white font-medium text-lg">Drag & drop your resume file here</p>
            <p className="text-sm text-gray-400 mt-2">Supported formats: PDF, DOCX (Max 10MB)</p>
            <label htmlFor="resume-file-input" className="mt-6">
              <Button type="button" variant="secondary" className="cursor-pointer">
                Browse files
              </Button>
            </label>
          </div>
        </div>
      )}

      {uploadState === 'uploading' && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center space-y-4">
          <RefreshCw size={36} className="text-primary mx-auto animate-spin" />
          <h4 className="text-lg font-semibold text-white">Processing Document...</h4>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">{statusMessage}</p>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden max-w-md mx-auto">
            <div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {uploadState === 'parsing' && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center space-y-4">
          <Sparkles size={36} className="text-cyan-300 mx-auto animate-pulse" />
          <h4 className="text-lg font-semibold text-white">AI Extraction & Intelligence...</h4>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">{statusMessage}</p>
          <div className="flex justify-center gap-1.5 h-6 items-center">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-cyan-300 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      )}

      {uploadState === 'error' && (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/5 p-8 text-center space-y-4">
          <AlertCircle size={40} className="text-rose-400 mx-auto" />
          <h4 className="text-lg font-semibold text-white">Upload Failed</h4>
          <p className="text-sm text-rose-300 max-w-sm mx-auto">{errorMessage}</p>
          <Button variant="secondary" onClick={() => setUploadState('idle')}>
            Try again
          </Button>
        </div>
      )}

      {uploadState === 'success' && resumeData && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-5 items-center justify-between p-5 rounded-3xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                <FileText size={22} />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-white">{resumeData.fileName}</h4>
                <p className="text-xs text-gray-400">Size: {(resumeData.fileSize / (1024 * 1024)).toFixed(2)} MB • Uploaded: {new Date(resumeData.uploadedAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="resume-file-input">
                <Button type="button" variant="secondary" className="gap-2 cursor-pointer">
                  <RefreshCw size={16} /> Replace
                </Button>
              </label>
              <Button variant="danger" className="gap-2" onClick={handleDelete}>
                <Trash2 size={16} /> Remove
              </Button>
            </div>
          </div>

          {resumeData.aiAnalysis && (
            <div className="grid gap-5 md:grid-cols-[1.3fr_0.7fr]">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-5 text-left">
                <div>
                  <h4 className="text-xs uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                    <CheckCircle size={14} className="text-cyan-300" /> AI Resume Assessment
                  </h4>
                  <p className="mt-3 text-sm leading-relaxed text-gray-200">{resumeData.aiAnalysis.recruiterSummary}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h5 className="text-xs uppercase tracking-wider text-emerald-300">Strengths</h5>
                    <ul className="mt-2 space-y-1.5 text-xs text-gray-300">
                      {safeArray(resumeData.aiAnalysis.strengths, 'resume strengths').slice(0, 4).map((str, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-xs uppercase tracking-wider text-amber-300 font-semibold">Suggested Gaps</h5>
                    <ul className="mt-2 space-y-1.5 text-xs text-gray-300">
                      {safeArray(resumeData.aiAnalysis.weakAreas, 'resume weak areas').slice(0, 4).map((weak, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />
                          <span>{weak}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {safeArray(resumeData.aiAnalysis.certifications, 'resume certifications').length > 0 && (
                  <div>
                    <h5 className="text-xs uppercase tracking-wider text-gray-500">Detected Certifications</h5>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {safeArray(resumeData.aiAnalysis.certifications, 'resume certifications').map((cert) => (
                        <span key={cert} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300">
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(16,185,129,0.1),rgba(2,6,23,0.4))] p-5 text-left">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-emerald-300 flex items-center gap-1.5">
                    <Star size={12} /> Quality Score
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">{resumeData.aiAnalysis.resumeQualityScore}%</div>
                  <p className="text-[10px] text-gray-400 mt-2">Overall structural completeness & content metrics.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(99,102,241,0.1),rgba(2,6,23,0.4))] p-5 text-left">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-indigo-300 flex items-center gap-1.5">
                    <Shield size={12} /> ATS Score
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">{resumeData.aiAnalysis.atsScore}%</div>
                  <p className="text-[10px] text-gray-400 mt-2">ATS readability and keyword optimization ranking.</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(6,182,212,0.1),rgba(2,6,23,0.4))] p-5 text-left">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-300 flex items-center gap-1.5">
                    <Sparkles size={12} /> Skill Match
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-white">{resumeData.aiAnalysis.skillConfidence}%</div>
                  <p className="text-[10px] text-gray-400 mt-2">Verified confidence match based on target skills.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
