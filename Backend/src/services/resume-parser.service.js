const fs = require('fs');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const groqService = require('../ai/groq.service');
const ApiError = require('../utils/api-error');

class ResumeParserService {
  async extractResumeText(filePath, mimeType) {
    if (!fs.existsSync(filePath)) {
      throw new ApiError(404, 'Resume file not found on disk');
    }

    try {
      if (mimeType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(dataBuffer);
        return pdfData.text || '';
      } 
      
      if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        mimeType === 'application/msword'
      ) {
        const docxData = await mammoth.extractRawText({ path: filePath });
        return docxData.value || '';
      }

      throw new ApiError(400, `Unsupported resume file format: ${mimeType}`);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, `Failed to extract text from file: ${error.message}`);
    }
  }

  async parseResumeContent(text) {
    if (!text || !text.trim()) {
      throw new ApiError(400, 'Resume raw text content is empty');
    }

    try {
      const parsedData = await groqService.analyzeResume(text);
      return parsedData;
    } catch (error) {
      throw new ApiError(502, `AI parsing failed: ${error.message}`);
    }
  }
}

module.exports = new ResumeParserService();
