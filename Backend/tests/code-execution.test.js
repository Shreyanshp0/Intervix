const test = require('node:test');
const assert = require('node:assert/strict');
const { runCode } = require('../src/controllers/code.controller');

test('Code Execution - executes simple JavaScript code and returns stdout', async () => {
  const req = {
    body: {
      code: 'console.log("Hello from test runner");'
    }
  };

  let resStatus = 200;
  let resJsonData = null;

  const res = {
    status(code) {
      resStatus = code;
      return this;
    },
    json(data) {
      resJsonData = data;
      return this;
    }
  };

  // Wrap controller in a promise since it's asynchronous
  await new Promise((resolve) => {
    runCode(req, res, (err) => {
      resolve();
    });
    
    // We check if res.json was called
    const checkInterval = setInterval(() => {
      if (resJsonData !== null) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 50);
  });

  assert.equal(resStatus, 200);
  assert.equal(resJsonData.success, true);
  assert.equal(resJsonData.output.trim(), 'Hello from test runner');
});

test('Code Execution - catches syntax errors and outputs stderr', async () => {
  const req = {
    body: {
      code: 'console.log(x); // x is undefined'
    }
  };

  let resStatus = 200;
  let resJsonData = null;

  const res = {
    status(code) {
      resStatus = code;
      return this;
    },
    json(data) {
      resJsonData = data;
      return this;
    }
  };

  await new Promise((resolve) => {
    runCode(req, res, () => {
      resolve();
    });

    const checkInterval = setInterval(() => {
      if (resJsonData !== null) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 50);
  });

  assert.equal(resStatus, 200);
  assert.equal(resJsonData.success, false);
  assert.match(resJsonData.error, /ReferenceError: x is not defined/);
});

test('Code Execution - terminates infinite loops safely and reports timeout', async () => {
  const req = {
    body: {
      code: 'while(true) {}'
    }
  };

  let resStatus = 200;
  let resJsonData = null;

  const res = {
    status(code) {
      resStatus = code;
      return this;
    },
    json(data) {
      resJsonData = data;
      return this;
    }
  };

  // Wait for the timeout (max 4s in controller + buffer)
  await new Promise((resolve) => {
    runCode(req, res, () => {
      resolve();
    });

    const checkInterval = setInterval(() => {
      if (resJsonData !== null) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });

  assert.equal(resStatus, 200);
  assert.equal(resJsonData.success, false);
  assert.match(resJsonData.error, /Execution Timed Out/);
});
