import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useResumeStore } from '../../store/resumeStore';
import { UploadCloud, FileText, Trash2, AlertCircle } from 'lucide-react';

const ResumeUpload = () => {
  const { 
    resume, hasResume, isUploading, uploadProgress, 
    error, uploadResume, deleteResume 
  } = useResumeStore();

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      const file = acceptedFiles[0];
      await uploadResume(file);
    }
  }, [uploadResume]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Resume & Parsing</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {hasResume && resume ? (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="font-medium text-gray-800">{resume.fileName}</p>
              <p className="text-xs text-gray-500">
                Uploaded on {new Date(resume.uploadedAt).toLocaleDateString()} • {resume.parsingStatus}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href={resume.fileUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              Preview
            </a>
            <button 
              onClick={deleteResume}
              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Resume"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <div 
          {...getRootProps()} 
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
            ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input {...getInputProps()} />
          <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-3" />
          
          {isUploading ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-blue-600">Uploading & Parsing Resume...</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-700 font-medium mb-1">
                {isDragActive ? 'Drop your resume here' : 'Click or drag your resume to upload'}
              </p>
              <p className="text-sm text-gray-500">Supports PDF, DOC, and DOCX up to 10MB</p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeUpload;