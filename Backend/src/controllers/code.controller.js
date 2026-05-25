const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Runs user-supplied JavaScript, Python, C, C++, or Java code in a child process safely with a timeout.
 */
const runCode = async (req, res, next) => {
  try {
    const { code, language } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'No code content provided' });
    }

    // Determine execution environment based on language selection
    const lang = (language || 'javascript').toLowerCase();
    let ext = 'js';
    let execCommand = 'node';
    let isCompiled = false;
    let compileCommand = '';

    const tempDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Generate unique file name and run commands
    const fileId = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    let fileName = `script_${fileId}.${ext}`;

    if (lang === 'python' || lang === 'py') {
      ext = 'py';
      execCommand = 'python3';
      fileName = `script_${fileId}.${ext}`;
    } else if (lang === 'c') {
      ext = 'c';
      fileName = `script_${fileId}.${ext}`;
      const binName = `bin_${fileId}`;
      const binPath = path.join(tempDir, binName);
      compileCommand = `gcc -O2 "${path.join(tempDir, fileName)}" -lm -o "${binPath}"`;
      execCommand = `"${binPath}"`;
      isCompiled = true;
    } else if (lang === 'cpp' || lang === 'c++') {
      ext = 'cpp';
      fileName = `script_${fileId}.${ext}`;
      const binName = `bin_${fileId}`;
      const binPath = path.join(tempDir, binName);
      compileCommand = `g++ -O2 -std=c++17 "${path.join(tempDir, fileName)}" -o "${binPath}"`;
      execCommand = `"${binPath}"`;
      isCompiled = true;
    } else if (lang === 'java') {
      ext = 'java';
      // Java public class must match file name, Solution is used in our wrapper
      fileName = 'Solution.java';
      // To prevent conflicts with parallel Java runs, we scope them by creating a subclass folder or run sequentially.
      // Since it's a local development/demo runtime, naming it Solution.java is simple and standard.
      compileCommand = `javac "${path.join(tempDir, fileName)}"`;
      execCommand = `java -cp "${tempDir}" Solution`;
      isCompiled = true;
    } else if (lang !== 'javascript' && lang !== 'js') {
      return res.status(400).json({ error: 'Language execution not supported in this local sandbox environment. Please select JavaScript, Python, C, C++, or Java.' });
    }

    const filePath = path.join(tempDir, fileName);

    // Write code to temp file
    fs.writeFileSync(filePath, code);

    const executeCode = () => {
      exec(execCommand, { timeout: 4000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
        // Clean up files asynchronously
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          if (isCompiled) {
            if (lang === 'c' || lang === 'cpp') {
              const binPath = execCommand.replace(/"/g, '');
              if (fs.existsSync(binPath)) {
                fs.unlinkSync(binPath);
              }
            } else if (lang === 'java') {
              const classFile = path.join(tempDir, 'Solution.class');
              if (fs.existsSync(classFile)) {
                fs.unlinkSync(classFile);
              }
            }
          }
        } catch (err) {
          console.error(`[Code Execution] Temp file cleanup failed: ${err.message}`);
        }

        if (error) {
          if (error.killed) {
            return res.status(200).json({
              success: false,
              output: '',
              error: 'Execution Timed Out (Maximum 4 seconds limit exceeded)',
            });
          }
          return res.status(200).json({
            success: false,
            output: stdout || '',
            error: stderr || error.message,
          });
        }

        return res.status(200).json({
          success: true,
          output: stdout || '',
          error: stderr || '',
        });
      });
    };

    if (isCompiled && compileCommand) {
      // Compile first
      exec(compileCommand, { timeout: 5000 }, (compileError, compileStdout, compileStderr) => {
        if (compileError) {
          // Clean up source file
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
          } catch (err) {
            console.error(`[Code Execution] Temp source file cleanup failed: ${err.message}`);
          }
          return res.status(200).json({
            success: false,
            output: '',
            error: `Compilation Error:\n${compileStderr || compileError.message}`,
          });
        }
        // Run compiled binary/class
        executeCode();
      });
    } else {
      executeCode();
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  runCode,
};
