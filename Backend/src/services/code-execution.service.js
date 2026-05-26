const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

const SUPPORTED_LANGUAGES = new Set(['javascript', 'js', 'python', 'py', 'c', 'cpp', 'c++', 'java']);

const normalizeLanguage = (language = 'javascript') => String(language || 'javascript').toLowerCase();

const safeUnlink = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    logger.warn(`[RUN_CODE] Temp cleanup failed: ${error.message}`);
  }
};

const execute = (command, options = {}) => new Promise((resolve) => {
  exec(command, { timeout: 4000, maxBuffer: 1024 * 1024, ...options }, (error, stdout, stderr) => {
    resolve({ error, stdout: stdout || '', stderr: stderr || '' });
  });
});

const runCode = async ({ code, language = 'javascript', input = '' }) => {
  if (!code) {
    const error = new Error('No code content provided');
    error.statusCode = 400;
    throw error;
  }

  const lang = normalizeLanguage(language);
  if (!SUPPORTED_LANGUAGES.has(lang)) {
    const error = new Error('Language execution not supported. Select JavaScript, Python, C, C++, or Java.');
    error.statusCode = 400;
    throw error;
  }

  const tempDir = path.join(__dirname, '../../uploads/temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const fileId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  let ext = 'js';
  let fileName = `script_${fileId}.js`;
  let execCommand = '';
  let compileCommand = '';
  let compiledArtifact = '';

  if (lang === 'python' || lang === 'py') {
    ext = 'py';
    fileName = `script_${fileId}.${ext}`;
  } else if (lang === 'c') {
    ext = 'c';
    fileName = `script_${fileId}.${ext}`;
    compiledArtifact = path.join(tempDir, `bin_${fileId}`);
    compileCommand = `gcc -O2 "${path.join(tempDir, fileName)}" -lm -o "${compiledArtifact}"`;
    execCommand = `"${compiledArtifact}"`;
  } else if (lang === 'cpp' || lang === 'c++') {
    ext = 'cpp';
    fileName = `script_${fileId}.${ext}`;
    compiledArtifact = path.join(tempDir, `bin_${fileId}`);
    compileCommand = `g++ -O2 -std=c++17 "${path.join(tempDir, fileName)}" -o "${compiledArtifact}"`;
    execCommand = `"${compiledArtifact}"`;
  } else if (lang === 'java') {
    fileName = `Solution_${fileId}.java`;
    const className = `Solution_${fileId}`;
    code = code.replace(/public\s+class\s+Solution/g, `public class ${className}`).replace(/class\s+Solution/g, `class ${className}`);
    compileCommand = `javac "${path.join(tempDir, fileName)}"`;
    execCommand = `java -cp "${tempDir}" ${className}`;
    compiledArtifact = path.join(tempDir, `${className}.class`);
  }

  const filePath = path.join(tempDir, fileName);
  if (lang === 'javascript' || lang === 'js') {
    execCommand = `node "${filePath}"`;
  } else if (lang === 'python' || lang === 'py') {
    execCommand = `python3 "${filePath}"`;
  }

  fs.writeFileSync(filePath, code);
  logger.info(`[RUN_CODE] Executing ${lang} submission ${fileId}`);

  try {
    if (compileCommand) {
      const compileResult = await execute(compileCommand, { timeout: 5000 });
      if (compileResult.error) {
        return {
          success: false,
          status: 'compile_error',
          output: compileResult.stdout,
          error: `Compilation Error:\n${compileResult.stderr || compileResult.error.message}`,
        };
      }
    }

    const command = input ? `${execCommand}` : execCommand;
    const result = await execute(command);
    if (result.error) {
      return {
        success: false,
        status: result.error.killed ? 'timeout' : 'runtime_error',
        output: result.stdout,
        error: result.error.killed ? 'Execution Timed Out (Maximum 4 seconds limit exceeded)' : (result.stderr || result.error.message),
      };
    }

    return {
      success: true,
      status: 'completed',
      output: result.stdout,
      error: result.stderr,
    };
  } finally {
    safeUnlink(filePath);
    safeUnlink(compiledArtifact);
  }
};

module.exports = {
  runCode,
  normalizeLanguage,
};
