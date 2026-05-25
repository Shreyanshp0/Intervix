import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { 
  Play, Terminal, Video, VideoOff, Monitor, Mic, MicOff, 
  BookOpen, Users, Copy, Check, LogOut, Code, ShieldAlert 
} from 'lucide-react';
import { connectSocket, disconnectSocket } from '../../services/socket';
import api from '../../services/api';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';

// 4 Standard coding questions with descriptions, starter codes, and test cases
const QUESTIONS = [
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    difficultyColor: 'bg-green-500/20 text-green-400 border-green-500/25',
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.
You may assume that each input would have exactly one solution, and you may not use the same element twice.
You can return the answer in any order.`,
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
      }
    ],
    constraints: [
      '2 <= nums.length <= 10^4',
      '-10^9 <= nums[i] <= 10^9',
      '-10^9 <= target <= 10^9',
      'Only one valid answer exists.'
    ],
    starterCodes: {
      javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
    // Write your code here
    
}`,
      python: `def twoSum(nums, target):
    # Write your code here
    pass`,
      c: `/**
 * Note: The returned array must be malloced, assume caller calls free().
 */
int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    // Write your code here
    *returnSize = 2;
    int* res = (int*)malloc(2 * sizeof(int));
    return res;
}`,
      cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Write your code here
        
    }
};`,
      java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Write your code here
        return new int[2];
    }
}`
    },
    testCases: [
      { id: 1, nums: '[2, 7, 11, 15]', target: '9', name: 'Case 1' },
      { id: 2, nums: '[3, 2, 4]', target: '6', name: 'Case 2' },
      { id: 3, nums: '[3, 3]', target: '6', name: 'Case 3' }
    ]
  },
  {
    id: 'reverse-string',
    title: 'Reverse String',
    difficulty: 'Easy',
    difficultyColor: 'bg-green-500/20 text-green-400 border-green-500/25',
    description: `Write a function that reverses a string. The input string is given as an array of characters \`s\`.
You must do this by modifying the input array in-place with O(1) extra memory.`,
    examples: [
      {
        input: 's = ["h","e","l","l","o"]',
        output: '["o","l","l","e","h"]',
        explanation: 'The input array is reversed in-place.'
      }
    ],
    constraints: [
      '1 <= s.length <= 10^5',
      's[i] is a printable ascii character.'
    ],
    starterCodes: {
      javascript: `/**
 * @param {character[]} s
 * @return {void} Do not return anything, modify s in-place instead.
 */
function reverseString(s) {
    // Write your code here
    
}`,
      python: `def reverseString(s):
    # Write your code here
    pass`,
      c: `void reverseString(char* s, int sSize) {
    // Write your code here
    
}`,
      cpp: `class Solution {
public:
    void reverseString(vector<char>& s) {
        // Write your code here
        
    }
};`,
      java: `class Solution {
    public void reverseString(char[] s) {
        // Write your code here
        
    }
}`
    },
    testCases: [
      { id: 1, s: '["h","e","l","l","o"]', name: 'Case 1' },
      { id: 2, s: '["H","a","n","n","a","h"]', name: 'Case 2' }
    ]
  },
  {
    id: 'palindrome-number',
    title: 'Palindrome Number',
    difficulty: 'Easy',
    difficultyColor: 'bg-green-500/20 text-green-400 border-green-500/25',
    description: `Given an integer \`x\`, return \`true\` if \`x\` is a palindrome, and \`false\` otherwise.`,
    examples: [
      {
        input: 'x = 121',
        output: 'true',
        explanation: '121 reads as 121 from left to right and from right to left.'
      },
      {
        input: 'x = -121',
        output: 'false',
        explanation: 'From left to right, it reads -121. From right to left, it becomes 121-. Therefore it is not a palindrome.'
      }
    ],
    constraints: [
      '-2^31 <= x <= 2^31 - 1'
    ],
    starterCodes: {
      javascript: `/**
 * @param {number} x
 * @return {boolean}
 */
function isPalindrome(x) {
    // Write your code here
    
}`,
      python: `def isPalindrome(x):
    # Write your code here
    pass`,
      c: `bool isPalindrome(int x) {
    // Write your code here
    return false;
}`,
      cpp: `class Solution {
public:
    bool isPalindrome(int x) {
        // Write your code here
        return false;
    }
};`,
      java: `class Solution {
    public boolean isPalindrome(int x) {
        // Write your code here
        return false;
    }
}`
    },
    testCases: [
      { id: 1, x: '121', name: 'Case 1' },
      { id: 2, x: '-121', name: 'Case 2' },
      { id: 3, x: '10', name: 'Case 3' }
    ]
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    difficultyColor: 'bg-green-500/20 text-green-400 border-green-500/25',
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.
An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    examples: [
      {
        input: 's = "()"',
        output: 'true',
        explanation: 'The brackets match.'
      },
      {
        input: 's = "()[]{}"',
        output: 'true',
        explanation: 'All brackets match in correct order.'
      }
    ],
    constraints: [
      '1 <= s.length <= 10^4',
      's consists of parentheses only \'()[]{}\'.'
    ],
    starterCodes: {
      javascript: `/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
    // Write your code here
    
}`,
      python: `def isValid(s):
    # Write your code here
    pass`,
      c: `bool isValid(char* s) {
    // Write your code here
    return false;
}`,
      cpp: `class Solution {
public:
    bool isValid(string s) {
        // Write your code here
        return false;
    }
};`,
      java: `class Solution {
    public boolean isValid(String s) {
        // Write your code here
        return false;
    }
}`
    },
    testCases: [
      { id: 1, s: '"()"', name: 'Case 1' },
      { id: 2, s: '"()[]{}"', name: 'Case 2' },
      { id: 3, s: '"(]"', name: 'Case 3' }
    ]
  }
];

// Browser-based JS Solver to dynamically compute EXPECTED values for custom/default inputs
const solveQuestion = (questionId, inputs) => {
  if (questionId === 'two-sum') {
    const { nums, target } = inputs;
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
      const diff = target - nums[i];
      if (map.has(diff)) return [map.get(diff), i];
      map.set(nums[i], i);
    }
    return [];
  }
  if (questionId === 'reverse-string') {
    const { s } = inputs;
    const copy = [...s];
    copy.reverse();
    return copy;
  }
  if (questionId === 'palindrome-number') {
    const { x } = inputs;
    if (x < 0) return false;
    const str = x.toString();
    return str === str.split('').reverse().join('');
  }
  if (questionId === 'valid-parentheses') {
    const { s } = inputs;
    const stack = [];
    const pairs = { ')': '(', '}': '{', ']': '[' };
    for (let char of s) {
      if (['(', '{', '['].includes(char)) {
        stack.push(char);
      } else if (pairs[char]) {
        if (stack.pop() !== pairs[char]) return false;
      }
    }
    return stack.length === 0;
  }
  return null;
};

// JavaScript Run Script Wrapper
const buildJavaScriptRunner = (userCode, parsedTestCases, questionId) => {
  let functionCall = '';
  if (questionId === 'two-sum') functionCall = 'twoSum(tc.input.nums, tc.input.target)';
  if (questionId === 'reverse-string') functionCall = '(function() { const sCopy = [...tc.input.s]; reverseString(sCopy); return sCopy; })()';
  if (questionId === 'palindrome-number') functionCall = 'isPalindrome(tc.input.x)';
  if (questionId === 'valid-parentheses') functionCall = 'isValid(tc.input.s)';

  return `
${userCode}

const testCases = ${JSON.stringify(parsedTestCases)};
const results = [];
for (let i = 0; i < testCases.length; i++) {
  try {
    const tc = testCases[i];
    const actual = ${functionCall};
    results.push({
      id: tc.id,
      actual: actual,
      error: null
    });
  } catch (err) {
    results.push({
      id: testCases[i].id,
      actual: null,
      error: err.message || err.toString()
    });
  }
}
console.log("\\n__INTERVIX_RESULTS__" + JSON.stringify(results) + "__INTERVIX_RESULTS__");
`;
};

// Python Run Script Wrapper
const buildPythonRunner = (userCode, parsedTestCases, questionId) => {
  let functionCall = '';
  if (questionId === 'two-sum') functionCall = 'twoSum(list(tc["input"]["nums"]), int(tc["input"]["target"]))';
  if (questionId === 'reverse-string') functionCall = '(lambda s: (reverseString(s), s)[1])(list(tc["input"]["s"]))';
  if (questionId === 'palindrome-number') functionCall = 'isPalindrome(int(tc["input"]["x"]))';
  if (questionId === 'valid-parentheses') functionCall = 'isValid(str(tc["input"]["s"]))';

  return `
${userCode}

import json
test_cases = ${JSON.stringify(parsedTestCases)}
results = []
for i, tc in enumerate(test_cases):
    try:
        actual = ${functionCall}
        results.append({
            "id": tc["id"],
            "actual": actual,
            "error": None
        })
    except Exception as e:
        results.append({
            "id": tc["id"],
            "actual": None,
            "error": str(e)
        })

print("\\n__INTERVIX_RESULTS__" + json.dumps(results) + "__INTERVIX_RESULTS__")
`;
};

// C++ Run Script Wrapper (Generates main loop to output test case results)
const buildCppRunner = (userCode, parsedTestCases, questionId) => {
  let testRuns = '';
  parsedTestCases.forEach(tc => {
    if (questionId === 'two-sum') {
      const numsArr = JSON.stringify(tc.input.nums).replace('[', '{').replace(']', '}');
      testRuns += `
    {
        Solution solver;
        vector<int> nums = ${numsArr};
        int target = ${tc.input.target};
        try {
            vector<int> actual = solver.twoSum(nums, target);
            cout << "{\\"id\\":${tc.id},\\"actual\\":[";
            for (size_t j = 0; j < actual.size(); j++) {
                cout << actual[j] << (j == actual.size() - 1 ? "" : ",");
            }
            cout << "],\\"error\\":null}," << endl;
        } catch (exception& e) {
            cout << "{\\"id\\":${tc.id},\\"actual\\":null,\\"error\\":\\"" << e.what() << "\\"}" << endl;
        } catch (...) {
            cout << "{\\"id\\":${tc.id},\\"actual\\":null,\\"error\\":\\"Unknown runtime error\\"}" << endl;
        }
    }
`;
    } else if (questionId === 'reverse-string') {
      const sArr = JSON.stringify(tc.input.s).replace('[', '{').replace(']', '}').replace(/"/g, "'");
      testRuns += `
    {
        Solution solver;
        vector<char> s = ${sArr};
        try {
            solver.reverseString(s);
            cout << "{\\"id\\":${tc.id},\\"actual\\":[";
            for (size_t j = 0; j < s.size(); j++) {
                cout << "\\"" << s[j] << "\\"" << (j == s.size() - 1 ? "" : ",");
            }
            cout << "],\\"error\\":null}," << endl;
        } catch (exception& e) {
            cout << "{\\"id\\":${tc.id},\\"actual\\":null,\\"error\\":\\"" << e.what() << "\\"}" << endl;
        }
    }
`;
    } else if (questionId === 'palindrome-number') {
      testRuns += `
    {
        Solution solver;
        int x = ${tc.input.x};
        try {
            bool actual = solver.isPalindrome(x);
            cout << "{\\"id\\":${tc.id},\\"actual\\":" << (actual ? "true" : "false") << ",\\"error\\":null}," << endl;
        } catch (exception& e) {
            cout << "{\\"id\\":${tc.id},\\"actual\\":null,\\"error\\":\\"" << e.what() << "\\"}" << endl;
        }
    }
`;
    } else if (questionId === 'valid-parentheses') {
      testRuns += `
    {
        Solution solver;
        string s = ${JSON.stringify(tc.input.s)};
        try {
            bool actual = solver.isValid(s);
            cout << "{\\"id\\":${tc.id},\\"actual\\":" << (actual ? "true" : "false") << ",\\"error\\":null}," << endl;
        } catch (exception& e) {
            cout << "{\\"id\\":${tc.id},\\"actual\\":null,\\"error\\":\\"" << e.what() << "\\"}" << endl;
        }
    }
`;
    }
  });

  return `
#include <iostream>
#include <vector>
#include <string>
#include <stack>
#include <algorithm>
#include <unordered_map>

using namespace std;

${userCode}

int main() {
    cout << "\\n__INTERVIX_RESULTS__[";
    ${testRuns}
    cout << "]" << endl;
    cout << "__INTERVIX_RESULTS__" << endl;
    return 0;
}
`;
};

// C Run Script Wrapper
const buildCRunner = (userCode, parsedTestCases, questionId) => {
  let testRuns = '';
  parsedTestCases.forEach(tc => {
    if (questionId === 'two-sum') {
      const numsArr = JSON.stringify(tc.input.nums).replace('[', '{').replace(']', '}');
      testRuns += `
    {
        int nums[] = ${numsArr};
        int returnSize = 0;
        int* actual = twoSum(nums, ${tc.input.nums.length}, ${tc.input.target}, &returnSize);
        printf("{\\"id\\":${tc.id},\\"actual\\":[");
        if (actual != NULL) {
            for (int j = 0; j < returnSize; j++) {
                printf("%d%s", actual[j], (j == returnSize - 1 ? "" : ","));
            }
            free(actual);
        }
        printf("],\\"error\\":null},");
    }
`;
    } else if (questionId === 'reverse-string') {
      const sArr = JSON.stringify(tc.input.s).replace('[', '{').replace(']', '}').replace(/"/g, "'");
      testRuns += `
    {
        char s[] = ${sArr};
        reverseString(s, ${tc.input.s.length});
        printf("{\\"id\\":${tc.id},\\"actual\\":[");
        for (int j = 0; j < ${tc.input.s.length}; j++) {
            printf("\\"%c\\"%s", s[j], (j == ${tc.input.s.length} - 1 ? "" : ","));
        }
        printf("],\\"error\\":null},");
    }
`;
    } else if (questionId === 'palindrome-number') {
      testRuns += `
    {
        bool actual = isPalindrome(${tc.input.x});
        printf("{\\"id\\":${tc.id},\\"actual\\":%s,\\"error\\":null},", actual ? "true" : "false");
    }
`;
    } else if (questionId === 'valid-parentheses') {
      testRuns += `
    {
        bool actual = isValid(${JSON.stringify(tc.input.s)});
        printf("{\\"id\\":${tc.id},\\"actual\\":%s,\\"error\\":null},", actual ? "true" : "false");
    }
`;
    }
  });

  return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

${userCode}

int main() {
    printf("\\n__INTERVIX_RESULTS__[");
    ${testRuns}
    printf("]\\n__INTERVIX_RESULTS__\\n");
    return 0;
}
`;
};

// Java Run Script Wrapper
const buildJavaRunner = (userCode, parsedTestCases, questionId) => {
  let testRuns = '';
  parsedTestCases.forEach(tc => {
    if (questionId === 'two-sum') {
      const numsArr = JSON.stringify(tc.input.nums).replace('[', '{').replace(']', '}');
      testRuns += `
        try {
            Solution solver = new Solution();
            int[] nums = new int[]${numsArr};
            int[] actual = solver.twoSum(nums, ${tc.input.target});
            System.out.print("{\\"id\\":${tc.id},\\"actual\\":[");
            if (actual != null) {
                for (int j = 0; j < actual.length; j++) {
                    System.out.print(actual[j] + (j == actual.length - 1 ? "" : ","));
                }
            }
            System.out.println("],\\"error\\":null},");
        } catch (Exception e) {
            System.out.println("{\\"id\\":${tc.id},\\"actual\\":null,\\"error\\":\\"" + e.getMessage() + "\\"}");
        }
`;
    } else if (questionId === 'reverse-string') {
      const chars = tc.input.s.map(c => `'${c}'`).join(',');
      testRuns += `
        try {
            Solution solver = new Solution();
            char[] s = new char[]{${chars}};
            solver.reverseString(s);
            System.out.print("{\\"id\\":${tc.id},\\"actual\\":[");
            for (int j = 0; j < s.length; j++) {
                System.out.print("\\"" + s[j] + "\\"" + (j == s.length - 1 ? "" : ","));
            }
            System.out.println("],\\"error\\":null},");
        } catch (Exception e) {
            System.out.println("{\\"id\\":${tc.id},\\"actual\\":null,\\"error\\":\\"" + e.getMessage() + "\\"}");
        }
`;
    } else if (questionId === 'palindrome-number') {
      testRuns += `
        try {
            Solution solver = new Solution();
            boolean actual = solver.isPalindrome(${tc.input.x});
            System.out.println("{\\"id\\":${tc.id},\\"actual\\":" + actual + ",\\"error\\":null},");
        } catch (Exception e) {
            System.out.println("{\\"id\\":${tc.id},\\"actual\\":null,\\"error\\":\\"" + e.getMessage() + "\\"}");
        }
`;
    } else if (questionId === 'valid-parentheses') {
      testRuns += `
        try {
            Solution solver = new Solution();
            boolean actual = solver.isValid(${JSON.stringify(tc.input.s)});
            System.out.println("{\\"id\\":${tc.id},\\"actual\\":" + actual + ",\\"error\\":null},");
        } catch (Exception e) {
            System.out.println("{\\"id\\":${tc.id},\\"actual\\":null,\\"error\\":\\"" + e.getMessage() + "\\"}");
        }
`;
    }
  });

  return `
import java.util.*;

${userCode}

public class Solution {
    public static void main(String[] args) {
        System.out.println("\\n__INTERVIX_RESULTS__[");
        ${testRuns}
        System.out.println("]");
        System.out.println("__INTERVIX_RESULTS__");
    }
}
`;
};

const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, login: loginUser } = useAuthStore();

  // Room Login states
  const [emailOrUserId, setEmailOrUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleRoomLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await loginUser({ email: emailOrUserId, password });
    } catch (err) {
      setLoginError(err.response?.data?.message || 'Unauthorized user');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Active question states
  const [activeQuestionId, setActiveQuestionId] = useState('two-sum');
  const activeQuestion = QUESTIONS.find(q => q.id === activeQuestionId) || QUESTIONS[0];

  // Code editor states
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(QUESTIONS[0].starterCodes.javascript);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const editorValueRef = useRef(code);
  const languageRef = useRef(language);

  // Track latest state values to prevent socket closure bugs
  const userRef = useRef(user);
  const activeQuestionIdRef = useRef(activeQuestionId);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    activeQuestionIdRef.current = activeQuestionId;
  }, [activeQuestionId]);

  // Test cases states
  const [testCases, setTestCases] = useState(QUESTIONS[0].testCases);
  const [selectedTestCaseIndex, setSelectedTestCaseIndex] = useState(0);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [activeConsoleTab, setActiveConsoleTab] = useState('testcases');
  const [runResults, setRunResults] = useState(null);

  // Lobby join state
  const [isJoined, setIsJoined] = useState(false);

  // WebRTC & Socket states
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [remoteScreenShareActive, setRemoteScreenShareActive] = useState(false);
  const remoteScreenShareVideoRef = useRef(null);

  // Bind remote stream to remote screenshare element when active
  useEffect(() => {
    if (remoteScreenShareVideoRef.current && remoteScreenShareActive) {
      remoteScreenShareVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteScreenShareActive]);

  // Refs for tracking media and WebRTC
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pcRef = useRef(null);
  const socketRef = useRef(null);

  // Transceiver helpers to find sender by media type
  const getAudioSender = (pc) => {
    if (!pc) return null;
    return pc.getTransceivers().find(t => t.receiver.track.kind === 'audio')?.sender;
  };

  const getVideoSender = (pc) => {
    if (!pc) return null;
    return pc.getTransceivers().find(t => t.receiver.track.kind === 'video')?.sender;
  };

  // Copy Room Link to clipboard
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Recruiter question selection change handler
  const handleQuestionChange = (newQuestionId) => {
    setActiveQuestionId(newQuestionId);
    const selectedQ = QUESTIONS.find(q => q.id === newQuestionId);
    if (selectedQ) {
      const defaultTemplate = selectedQ.starterCodes[language] || '';
      setCode(defaultTemplate);
      editorValueRef.current = defaultTemplate;
      setTestCases(selectedQ.testCases);
      setSelectedTestCaseIndex(0);
      setRunResults(null);

      if (socketRef.current) {
        socketRef.current.emit('question-change', {
          roomId,
          questionId: newQuestionId,
          starterCode: defaultTemplate,
          starterLanguage: language
        });
      }
    }
  };

  // Run code against backend API (supporting JS, Python, C, C++, Java)
  const handleRunCode = async () => {
    setIsRunning(true);
    setActiveConsoleTab('results');
    setRunResults(null);
    setOutput('Running test cases...');

    // Parse test cases inputs depending on activeQuestionId
    const parsedTestCases = [];
    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      try {
        let inputObj = {};
        if (activeQuestionId === 'two-sum') {
          inputObj = {
            nums: JSON.parse(tc.nums),
            target: parseInt(tc.target, 10)
          };
        } else if (activeQuestionId === 'reverse-string') {
          inputObj = {
            s: JSON.parse(tc.s)
          };
        } else if (activeQuestionId === 'palindrome-number') {
          inputObj = {
            x: parseInt(tc.x, 10)
          };
        } else if (activeQuestionId === 'valid-parentheses') {
          let sVal = tc.s;
          try {
            sVal = JSON.parse(tc.s);
          } catch (_) {
            sVal = tc.s;
          }
          inputObj = { s: sVal };
        }
        parsedTestCases.push({
          id: tc.id,
          input: inputObj
        });
      } catch (e) {
        setOutput(`Failed to parse test case ${tc.name || (i + 1)}: ${e.message}\nPlease ensure array/string inputs are in valid JSON format.`);
        setIsRunning(false);
        return;
      }
    }

    let wrappedCode = '';
    if (language === 'javascript') {
      wrappedCode = buildJavaScriptRunner(code, parsedTestCases, activeQuestionId);
    } else if (language === 'python') {
      wrappedCode = buildPythonRunner(code, parsedTestCases, activeQuestionId);
    } else if (language === 'c') {
      wrappedCode = buildCRunner(code, parsedTestCases, activeQuestionId);
    } else if (language === 'cpp') {
      wrappedCode = buildCppRunner(code, parsedTestCases, activeQuestionId);
    } else if (language === 'java') {
      wrappedCode = buildJavaRunner(code, parsedTestCases, activeQuestionId);
    } else {
      setOutput('Language execution not supported.');
      setIsRunning(false);
      return;
    }

    try {
      const res = await api.post('/api/code/run', { code: wrappedCode, language });
      if (res.data.success) {
        const fullOutput = res.data.output || '';
        const marker = '__INTERVIX_RESULTS__';
        const parts = fullOutput.split(marker);
        
        if (parts.length >= 3) {
          let resultsJson = parts[1].trim();
          // Clean trailing commas
          resultsJson = resultsJson.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
          try {
            const parsedResults = JSON.parse(resultsJson);
            
            // Map over results to attach input, expected output, and passed status
            const completedResults = parsedResults.map(r => {
              const tc = parsedTestCases.find(t => t.id === r.id);
              const expectedVal = solveQuestion(activeQuestionId, tc.input);
              const passed = JSON.stringify(r.actual) === JSON.stringify(expectedVal);
              return {
                ...r,
                input: tc.input,
                expected: expectedVal,
                passed
              };
            });
            
            setRunResults(completedResults);
            
            // Clean stdout/logs
            const cleanedOutput = (parts[0] + (parts[2] || '')).trim();
            setOutput(cleanedOutput || 'No stdout logs generated.');
          } catch (err) {
            console.error('Error parsing result json:', err);
            setOutput(`Failed to parse execution wrapper output.\n\nRaw Output:\n${fullOutput}`);
          }
        } else {
          // If we didn't find the results marker, it might be a compilation error or output didn't run
          setOutput(fullOutput);
        }
      } else {
        setOutput(`Execution failed:\n\n${res.data.error || 'Unknown Error'}`);
      }
    } catch (err) {
      console.error(err);
      setOutput(`Failed to communicate with execution server:\n${err.response?.data?.error || err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // Toggle Mute Audio
  const toggleMute = async () => {
    if (isMuted) {
      // Turn microphone ON
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newAudioTrack = stream.getAudioTracks()[0];
        
        if (localStreamRef.current) {
          localStreamRef.current.getAudioTracks().forEach(t => {
            t.stop();
            localStreamRef.current.removeTrack(t);
          });
          localStreamRef.current.addTrack(newAudioTrack);
        } else {
          localStreamRef.current = new MediaStream([newAudioTrack]);
        }
        
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        
        if (pcRef.current) {
          const sender = getAudioSender(pcRef.current);
          if (sender) {
            await sender.replaceTrack(newAudioTrack);
          }
        }
        setIsMuted(false);
      } catch (err) {
        console.error('[WebRTC] Microphone start failed:', err);
      }
    } else {
      // Turn microphone OFF
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
          track.enabled = false;
          track.stop();
          localStreamRef.current.removeTrack(track);
        });
      }
      
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      
      if (pcRef.current) {
        const sender = getAudioSender(pcRef.current);
        if (sender) {
          await sender.replaceTrack(null);
        }
      }
      setIsMuted(true);
    }
  };

  // Toggle Camera Video
  const toggleVideo = async () => {
    if (isVideoOff) {
      // Turn camera ON
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const newVideoTrack = stream.getVideoTracks()[0];
        
        if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(t => {
            t.stop();
            localStreamRef.current.removeTrack(t);
          });
          localStreamRef.current.addTrack(newVideoTrack);
        } else {
          localStreamRef.current = new MediaStream([newVideoTrack]);
        }
        
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
        
        if (pcRef.current) {
          const sender = getVideoSender(pcRef.current);
          if (sender) {
            await sender.replaceTrack(newVideoTrack);
          }
        }
        setIsVideoOff(false);
      } catch (err) {
        console.error('[WebRTC] Camera start failed:', err);
      }
    } else {
      // Turn camera OFF
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.stop();
          localStreamRef.current.removeTrack(track);
        });
      }
      
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      
      if (pcRef.current) {
        const sender = getVideoSender(pcRef.current);
        if (sender) {
          await sender.replaceTrack(null);
        }
      }
      setIsVideoOff(true);
    }
  };

  // Screen Sharing logic
  const startScreenShare = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const videoTrack = screenStream.getVideoTracks()[0];

      if (pcRef.current) {
        const sender = getVideoSender(pcRef.current);
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
      }

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      videoTrack.onended = () => {
        stopScreenShare();
      };

      // Stop camera track completely during screen share to turn off camera light
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.stop();
          localStreamRef.current.removeTrack(track);
        });
      }

      // Notify other peers via socket that screen sharing started
      if (socketRef.current) {
        socketRef.current.emit('screen-share-status', { roomId, isSharing: true });
      }

      setIsScreenSharing(true);
      screenStreamRef.current = screenStream;
    } catch (err) {
      console.error('[ScreenShare] Error starting screen share:', err);
    }
  };

  const stopScreenShare = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }

    // Restore camera stream if video was NOT toggled off
    if (!isVideoOff) {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const cameraVideoTrack = cameraStream.getVideoTracks()[0];
        
        if (localStreamRef.current) {
          localStreamRef.current.addTrack(cameraVideoTrack);
        } else {
          localStreamRef.current = new MediaStream([cameraVideoTrack]);
        }
        
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));

        if (pcRef.current) {
          const sender = getVideoSender(pcRef.current);
          if (sender) {
            await sender.replaceTrack(cameraVideoTrack);
          }
        }
      } catch (err) {
        console.error('[ScreenShare] Error restarting camera after screen share:', err);
      }
    } else {
      if (pcRef.current) {
        const sender = getVideoSender(pcRef.current);
        if (sender) {
          await sender.replaceTrack(null);
        }
      }
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }

    // Notify other peers via socket that screen sharing stopped
    if (socketRef.current) {
      socketRef.current.emit('screen-share-status', { roomId, isSharing: false });
    }

    setIsScreenSharing(false);
  };

  // Bind local stream to video element
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isJoined]);

  // Bind remote stream to video element
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isJoined]);

  // Helper to create RTCPeerConnection
  const createPeerConnection = (peerSocketId, socket, stream) => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.iceQueue = []; // Queue to hold candidates arriving before setRemoteDescription

    pcRef.current = pc;

    // Ensure transceivers/senders always exist for both audio and video
    const hasAudio = stream && stream.getAudioTracks().length > 0;
    const hasVideo = stream && stream.getVideoTracks().length > 0;

    if (hasAudio) {
      stream.getAudioTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    } else {
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    }

    if (hasVideo) {
      stream.getVideoTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    } else {
      pc.addTransceiver('video', { direction: 'sendrecv' });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { roomId, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        console.log('[WebRTC] Received remote stream track:', event.streams[0]);
        setRemoteStream(event.streams[0]);
      }
    };

    return pc;
  };

  // Local Editor Text or Language updates
  const handleEditorChange = (value) => {
    setCode(value);
    editorValueRef.current = value;
    if (socketRef.current) {
      socketRef.current.emit('code-change', { roomId, code: value, language });
    }
  };

  // Handles dropdown language switches
  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    languageRef.current = newLanguage;
    
    // Set to new starter template code
    const currentQ = QUESTIONS.find(q => q.id === activeQuestionIdRef.current) || QUESTIONS[0];
    const defaultTemplate = currentQ.starterCodes[newLanguage] || '';
    setCode(defaultTemplate);
    editorValueRef.current = defaultTemplate;

    if (socketRef.current) {
      socketRef.current.emit('code-change', { roomId, code: defaultTemplate, language: newLanguage });
    }
  };

  // 1. Initialize local preview stream for lobby (on mount / auth)
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const initLocalPreview = async () => {
      if (localStreamRef.current) return; // already initialized

      let stream = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });
      } catch (err) {
        console.warn('Failed to get both video and audio, trying audio only...', err);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
          setIsVideoOff(true);
        } catch (audioErr) {
          console.error('Microphone also failed/blocked:', audioErr);
          setErrorMsg('Camera and Microphone blocked. You can still code collaboratively.');
        }
      }

      if (stream) {
        setLocalStream(stream);
        localStreamRef.current = stream;
      }
    };

    initLocalPreview();

    return () => {
      // Clean up localStream if we unmount completely before joining or if user logs out
      if (!isJoined && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
    };
  }, [isAuthenticated, user, isJoined]);

  // 2. Connect socket and setup WebRTC signaling ONLY when joined
  useEffect(() => {
    if (!isAuthenticated || !user || !isJoined) return;

    const socket = connectSocket();
    socketRef.current = socket;

    socket.emit('join-room', { roomId });

    socket.on('room-joined', ({ peers }) => {
      console.log('[Sockets] Joined room. Active peers in room:', peers);
      if (peers.length > 0) {
        setIsPeerConnected(true);
      }
    });

    socket.on('user-joined', async ({ socketId }) => {
      console.log('[Sockets] New user joined:', socketId);
      setIsPeerConnected(true);

      // If I am a recruiter, automatically sync my active question and code/language with the newly joined user
      if (userRef.current?.role === 'recruiter') {
        console.log('[Sockets] Interviewer syncing active question and code with candidate...');
        socket.emit('question-change', {
          roomId,
          questionId: activeQuestionIdRef.current,
          starterCode: editorValueRef.current,
          starterLanguage: languageRef.current
        });
      }

      const pc = createPeerConnection(socketId, socket, localStreamRef.current);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { roomId, offer });
      } catch (err) {
        console.error('[WebRTC] Offer creation failed:', err);
      }
    });

    socket.on('offer', async ({ offer, senderId }) => {
      console.log('[WebRTC] Received offer from:', senderId);
      setIsPeerConnected(true);

      const pc = createPeerConnection(senderId, socket, localStreamRef.current);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { roomId, answer });

        // Process queued candidates
        if (pc.iceQueue) {
          for (const candidate of pc.iceQueue) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
              console.error('[WebRTC] Error adding queued candidate:', e);
            }
          }
          pc.iceQueue = [];
        }
      } catch (err) {
        console.error('[WebRTC] Failed to process offer and send answer:', err);
      }
    });

    socket.on('answer', async ({ answer, senderId }) => {
      console.log('[WebRTC] Received answer from:', senderId);
      const pc = pcRef.current;
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          // Process queued candidates
          if (pc.iceQueue) {
            for (const candidate of pc.iceQueue) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (e) {
                console.error('[WebRTC] Error adding queued candidate:', e);
              }
            }
            pc.iceQueue = [];
          }
        } catch (err) {
          console.error('[WebRTC] Failed to apply remote answer description:', err);
        }
      }
    });

    socket.on('ice-candidate', async ({ candidate }) => {
      const pc = pcRef.current;
      if (pc) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error('[WebRTC] Failed to add remote ICE candidate:', err);
          }
        } else {
          pc.iceQueue.push(candidate);
        }
      }
    });

    // Synchronize both code contents and active programming language
    socket.on('code-update', ({ code: newCode, language: newLang }) => {
      if (newLang && newLang !== languageRef.current) {
        setLanguage(newLang);
        languageRef.current = newLang;
      }
      if (newCode !== editorValueRef.current) {
        editorValueRef.current = newCode;
        setCode(newCode);
      }
    });

    socket.on('question-changed', ({ questionId, starterCode, starterLanguage }) => {
      console.log('[Sockets] Question changed by interviewer:', questionId);
      setActiveQuestionId(questionId);
      if (starterLanguage) {
        setLanguage(starterLanguage);
        languageRef.current = starterLanguage;
      }
      setCode(starterCode);
      editorValueRef.current = starterCode;

      const targetQ = QUESTIONS.find(q => q.id === questionId);
      if (targetQ) {
        setTestCases(targetQ.testCases);
        setSelectedTestCaseIndex(0);
        setRunResults(null);
      }
    });

    socket.on('screen-share-updated', ({ isSharing }) => {
      console.log('[Sockets] Screen share updated:', isSharing);
      setRemoteScreenShareActive(isSharing);
    });

    socket.on('user-left', ({ socketId }) => {
      console.log('[Sockets] User left room:', socketId);
      setIsPeerConnected(false);
      setRemoteStream(null);
      setRemoteScreenShareActive(false);
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    });

    return () => {
      console.log('[RoomPage] Cleaning up room subscriptions...');
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        setLocalStream(null);
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }

      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      const socket = socketRef.current;
      if (socket) {
        socket.off('room-joined');
        socket.off('user-joined');
        socket.off('offer');
        socket.off('answer');
        socket.off('ice-candidate');
        socket.off('code-update');
        socket.off('question-changed');
        socket.off('screen-share-updated');
        socket.off('user-left');
      }
      disconnectSocket();
    };
  }, [roomId, isAuthenticated, user, isJoined]);

  const handleJoin = (videoEnabled) => {
    if (!videoEnabled) {
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach(track => {
          track.stop();
          localStreamRef.current.removeTrack(track);
        });
      }
      setLocalStream(new MediaStream(localStreamRef.current ? localStreamRef.current.getTracks() : []));
      setIsVideoOff(true);
    }
    setIsJoined(true);
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center relative overflow-hidden p-4 font-sans text-gray-200">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="text-3xl font-bold tracking-tighter inline-flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-sans text-white text-lg font-bold">
                I
              </div>
              Intervix<span className="text-blue-500">.ai</span>
            </div>
            <p className="text-gray-400 text-sm">Please log in to join live interview room <span className="text-blue-400 font-mono font-semibold">{roomId}</span></p>
          </div>

          <div className="bg-[#0D1220]/80 border border-white/5 backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
            <form onSubmit={handleRoomLogin} className="space-y-5">
              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-2">Email Address or User ID</label>
                <input
                  type="text"
                  required
                  placeholder="you@example.com or user ID"
                  value={emailOrUserId}
                  onChange={(e) => setEmailOrUserId(e.target.value)}
                  className="w-full bg-[#080B11] text-sm text-gray-200 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider text-gray-400 font-bold mb-2">Password</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#080B11] text-sm text-gray-200 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full mt-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              >
                {isLoggingIn ? 'Verifying...' : 'Join Interview'}
              </button>

              {loginError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl text-center font-medium mt-4">
                  {loginError}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user && !isJoined) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center relative overflow-hidden p-6 font-sans text-gray-200">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-5xl relative z-10 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Column: Video Preview Frame */}
          <div className="md:col-span-7 flex flex-col items-center gap-6">
            <div className="text-center md:hidden mb-2">
              <div className="text-3xl font-bold tracking-tighter inline-flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-sans text-white text-lg font-bold">
                  I
                </div>
                Intervix<span className="text-blue-500">.ai</span>
              </div>
              <p className="text-gray-400 text-sm">Preview Lobby</p>
            </div>

            <div className="w-full aspect-video rounded-2xl overflow-hidden bg-[#0D1220]/80 border border-white/10 relative shadow-2xl flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ objectFit: 'cover' }}
                className="absolute inset-0 w-full h-full scale-x-[-1]"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-[#0B0F19] flex flex-col items-center justify-center text-sm text-gray-400 gap-3">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-500">
                    <VideoOff size={32} />
                  </div>
                  <span className="font-medium">Camera is off</span>
                </div>
              )}

              <div className="absolute bottom-4 left-4 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg text-xs text-gray-300 font-medium">
                {user.name || user.email} (Lobby Preview)
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full border transition-all shadow-lg hover:scale-105 active:scale-95 ${
                  isMuted
                    ? 'bg-red-500/20 border-red-500/30 text-red-400'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                }`}
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full border transition-all shadow-lg hover:scale-105 active:scale-95 ${
                  isVideoOff
                    ? 'bg-red-500/20 border-red-500/30 text-red-400'
                    : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
                }`}
                title={isVideoOff ? 'Turn Camera On' : 'Turn Camera Off'}
              >
                {isVideoOff ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            </div>
          </div>

          {/* Right Column: Join Details Card */}
          <div className="md:col-span-5 bg-[#0D1220]/80 border border-white/5 backdrop-blur-xl p-8 rounded-2xl shadow-2xl flex flex-col gap-6">
            <div className="hidden md:block">
              <div className="text-3xl font-bold tracking-tighter inline-flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-sans text-white text-lg font-bold">
                  I
                </div>
                Intervix<span className="text-blue-500">.ai</span>
              </div>
              <p className="text-gray-400 text-sm">Ready to join your interview?</p>
            </div>

            <div className="space-y-4">
              <div className="bg-[#080B11] border border-white/5 rounded-xl p-4">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Room Code</span>
                <p className="text-sm font-mono text-blue-400 font-semibold mt-1 break-all">{roomId}</p>
              </div>

              <div className="bg-[#080B11] border border-white/5 rounded-xl p-4">
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Joining As</span>
                <p className="text-sm text-gray-300 font-semibold mt-1">{user.name || user.email}</p>
                <p className="text-xs text-gray-500 capitalize mt-0.5">{user.role}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleJoin(true)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                Join with Video & Audio
              </button>

              <button
                onClick={() => handleJoin(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 font-semibold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                Join with Audio Only
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => navigate('/')}
                className="text-xs text-gray-500 hover:text-gray-400 underline transition-colors"
              >
                Cancel and return home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#0B0F19] text-gray-200 flex flex-col overflow-hidden font-sans relative">
      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-surface/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#1A1F2C] px-3 py-1 rounded-lg border border-white/5">
            <Code size={16} className="text-blue-400" />
            <span className="text-sm font-semibold text-gray-300">Room: {roomId}</span>
          </div>
          <button 
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md border border-white/5"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy Invite Link'}
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/10 max-w-sm truncate">
            <ShieldAlert size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors bg-red-500/10 hover:bg-red-500/20 px-3.5 py-1.5 rounded-lg border border-red-500/10 font-medium"
          >
            <LogOut size={14} /> Exit Room
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Panel 1: LeetCode Question (1/4 Width) */}
        <div className="w-1/4 border-r border-white/5 flex flex-col bg-[#0D1220]/60">
          <div className="h-10 border-b border-white/5 flex items-center px-4 bg-[#141A2D] text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <BookOpen size={14} className="mr-2 text-blue-400" /> Problem Statement
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {user?.role === 'recruiter' ? (
              <div className="space-y-1.5 bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                <label className="block text-[10px] uppercase tracking-wider text-blue-400 font-bold">Active Question (Interviewer Control)</label>
                <select
                  value={activeQuestionId}
                  onChange={(e) => handleQuestionChange(e.target.value)}
                  className="w-full bg-[#111625] text-xs font-semibold text-gray-300 border border-white/10 rounded-lg px-3 py-2 outline-none cursor-pointer focus:border-blue-500"
                >
                  {QUESTIONS.map(q => (
                    <option key={q.id} value={q.id}>{q.title} ({q.difficulty})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 px-3 py-2 rounded-xl border border-blue-500/15">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span>Question synced with Interviewer</span>
              </div>
            )}

            <div className="border-t border-white/5 pt-3">
              <h1 className="text-lg font-bold text-white">{activeQuestion.title}</h1>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] ${activeQuestion.difficultyColor} border`}>
                {activeQuestion.difficulty}
              </span>
            </div>
            
            <div className="text-sm leading-relaxed text-gray-300 whitespace-pre-wrap font-sans">
              {activeQuestion.description}
            </div>

            {/* Examples */}
            {activeQuestion.examples && activeQuestion.examples.map((ex, exIdx) => (
              <div key={exIdx} className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-3 font-mono text-xs">
                <p className="text-blue-400 font-semibold uppercase tracking-wider text-[10px]">Example {exIdx + 1}:</p>
                <div className="text-gray-300 space-y-1">
                  <p><span className="text-gray-400">Input:</span> {ex.input}</p>
                  <p><span className="text-gray-400">Output:</span> {ex.output}</p>
                  {ex.explanation && <p><span className="text-gray-400">Explanation:</span> {ex.explanation}</p>}
                </div>
              </div>
            ))}

            {/* Constraints */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2 text-xs">
              <p className="text-blue-400 font-semibold uppercase tracking-wider text-[10px]">Constraints:</p>
              <ul className="list-disc pl-4 space-y-1 text-gray-400 font-mono">
                {activeQuestion.constraints && activeQuestion.constraints.map((c, cIdx) => (
                  <li key={cIdx}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Center Section: Code Editor & Console (2/4 Width) */}
        <div className="flex-1 flex flex-col border-r border-white/5 bg-[#080B11]">
          {/* Editor Header */}
          <div className="h-10 border-b border-white/5 flex items-center justify-between px-4 bg-[#141A2D]">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400"></span>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Run Environment</span>
              </div>
              
              {/* Language Selection Dropdown */}
              <select 
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-[#0B0F19] text-xs font-semibold text-gray-300 border border-white/10 rounded px-2.5 py-1 outline-none cursor-pointer focus:border-blue-500"
              >
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="python">Python 3 (3.11)</option>
                <option value="c">C (GCC)</option>
                <option value="cpp">C++ (G++)</option>
                <option value="java">Java (OpenJDK)</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleRunCode} 
                isLoading={isRunning}
                className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-500/20 py-1.5 h-auto text-xs"
              >
                <Play size={12} className="mr-1.5" /> Run Code
              </Button>
            </div>
          </div>

          {/* Monaco Editor Pane OR Remote Screen Share Feed */}
          <div className="flex-1 relative bg-[#0B0F19] flex items-center justify-center overflow-hidden">
            {remoteScreenShareActive ? (
              <video
                ref={remoteScreenShareVideoRef}
                autoPlay
                playsInline
                style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                className="w-full h-full bg-black/60"
              />
            ) : (
              <Editor
                height="100%"
                language={language}
                theme="vs-dark"
                value={code}
                onChange={handleEditorChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13.5,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  lineHeight: 22,
                  padding: { top: 12 },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on"
                }}
              />
            )}
          </div>

          {/* Output Terminal Console (Bottom Pane) */}
          <div className="h-64 border-t border-white/5 bg-[#090D1A] flex flex-col">
            {/* Console Tabs Header */}
            <div className="h-10 bg-[#111625] border-b border-white/5 flex items-center justify-between px-4 text-xs font-semibold text-gray-400">
              <div className="flex gap-4 h-full">
                <button
                  onClick={() => setActiveConsoleTab('testcases')}
                  className={`h-full px-2 flex items-center gap-1.5 border-b-2 transition-all ${
                    activeConsoleTab === 'testcases'
                      ? 'border-blue-500 text-white font-bold'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Test Cases
                </button>
                <button
                  onClick={() => setActiveConsoleTab('results')}
                  className={`h-full px-2 flex items-center gap-1.5 border-b-2 transition-all ${
                    activeConsoleTab === 'results'
                      ? 'border-blue-500 text-white font-bold'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Run Results
                </button>
                <button
                  onClick={() => setActiveConsoleTab('logs')}
                  className={`h-full px-2 flex items-center gap-1.5 border-b-2 transition-all ${
                    activeConsoleTab === 'logs'
                      ? 'border-blue-500 text-white font-bold'
                      : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Stdout / Logs
                </button>
              </div>
              <button 
                onClick={() => {
                  setOutput('');
                  setRunResults(null);
                }}
                className="text-[10px] text-gray-500 hover:text-white transition-colors"
              >
                Reset Output
              </button>
            </div>

            {/* Console Content */}
            <div className="flex-1 overflow-y-auto bg-[#05070E]">
              {activeConsoleTab === 'testcases' && (
                <div className="flex gap-4 p-4 h-full">
                  {/* Test Case Selectors */}
                  <div className="flex flex-col gap-2 border-r border-white/5 pr-4 shrink-0 justify-start">
                    {testCases.map((tc, idx) => (
                      <button
                        key={tc.id}
                        onClick={() => setSelectedTestCaseIndex(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left ${
                          selectedTestCaseIndex === idx 
                            ? 'bg-blue-600/20 border border-blue-500/35 text-blue-400' 
                            : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {tc.name}
                      </button>
                    ))}
                  </div>
                  {/* Inputs Form */}
                  <div className="flex-1 space-y-3 text-left max-w-lg overflow-y-auto pr-2">
                    {testCases[selectedTestCaseIndex] && Object.keys(testCases[selectedTestCaseIndex])
                      .filter(key => key !== 'id' && key !== 'name')
                      .map(key => (
                        <div key={key}>
                          <label className="block text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1">{key}</label>
                          <input
                            type="text"
                            value={testCases[selectedTestCaseIndex][key] || ''}
                            onChange={(e) => {
                              const updated = [...testCases];
                              updated[selectedTestCaseIndex] = {
                                ...updated[selectedTestCaseIndex],
                                [key]: e.target.value
                              };
                              setTestCases(updated);
                            }}
                            className="w-full bg-[#0B0F19] text-xs font-mono text-gray-200 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {activeConsoleTab === 'results' && (
                <div className="p-4 h-full">
                  {!runResults ? (
                    <div className="text-gray-500 text-xs font-mono text-left">
                      {isRunning ? 'Running code against test cases...' : 'Run your code in the editor to evaluate output here.'}
                    </div>
                  ) : (
                    <div className="flex gap-4 h-full">
                      {/* Result Test Case Selectors */}
                      <div className="flex flex-col gap-2 border-r border-white/5 pr-4 shrink-0 justify-start">
                        {runResults.map((res, idx) => (
                          <button
                            key={res.id}
                            onClick={() => setSelectedResultIndex(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors text-left flex items-center justify-between gap-3 ${
                              selectedResultIndex === idx 
                                ? 'bg-blue-600/20 border border-blue-500/35 text-blue-400' 
                                : 'bg-white/5 border border-white/10 text-gray-400 hover:text-white'
                            }`}
                          >
                            <span>Case {res.id}</span>
                            <span className={`h-2 w-2 rounded-full ${res.passed ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          </button>
                        ))}
                      </div>

                      {/* Result Details */}
                      <div className="flex-1 text-left space-y-3 font-mono text-xs max-w-xl">
                        {runResults[selectedResultIndex] && (() => {
                          const res = runResults[selectedResultIndex];
                          return (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] uppercase font-bold text-gray-500">Status:</span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  res.passed 
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/25' 
                                    : 'bg-red-500/20 text-red-400 border border-red-500/25'
                                }`}>
                                  {res.passed ? 'PASSED' : 'FAILED'}
                                </span>
                              </div>
                              {res.error ? (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg whitespace-pre-wrap">
                                  {res.error}
                                </div>
                              ) : (
                                <div className="space-y-2 bg-white/5 p-3 rounded-lg border border-white/5">
                                  <div>
                                    <span className="text-gray-400 font-semibold">Inputs:</span>
                                    <div className="text-gray-200 text-[11px] mt-0.5">
                                      {Object.keys(res.input || {}).map(k => `${k} = ${JSON.stringify(res.input[k])}`).join(', ')}
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 font-semibold">Expected:</span>
                                    <div className="text-green-400 text-[11px] mt-0.5">{JSON.stringify(res.expected)}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-400 font-semibold">Actual Output:</span>
                                    <div className={`${res.passed ? 'text-green-400' : 'text-red-400'} text-[11px] mt-0.5`}>{JSON.stringify(res.actual)}</div>
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeConsoleTab === 'logs' && (
                <div className="p-4 font-mono text-xs text-left overflow-y-auto text-gray-300 whitespace-pre-wrap">
                  {output || 'No logs printed during run.'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Panel 3: Video Calling / Signaling Workspace (1/4 Width) - Hidden when anyone is screensharing */}
        {!remoteScreenShareActive && !isScreenSharing && (
          <div className="w-1/4 flex flex-col bg-[#0D1220]/60 space-y-4 p-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <Users size={14} className="mr-2 text-blue-400" /> 1:1 Video Feed
              </div>
              <span className={`h-2 w-2 rounded-full ${isPeerConnected ? 'bg-green-500' : 'bg-gray-500 animate-pulse'}`}></span>
            </div>

            {/* Local Feed */}
            <div className="flex-1 relative rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center min-h-[160px]">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ objectFit: 'cover' }}
                className="absolute inset-0 w-full h-full"
              />
              {isVideoOff && (
                <div className="absolute inset-0 bg-[#0B0F19] flex flex-col items-center justify-center text-xs text-gray-500 gap-2">
                  <VideoOff size={24} />
                  <span>Your Camera is Off</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[10px] text-gray-300 font-medium">
                You (Local Stream)
              </div>
            </div>

            {/* Remote Feed */}
            <div className="flex-1 relative rounded-xl overflow-hidden bg-black/40 border border-white/5 flex items-center justify-center min-h-[160px]">
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                style={{ objectFit: 'cover' }}
                className={`absolute inset-0 w-full h-full ${remoteStream ? 'block' : 'hidden'}`}
              />
              {!remoteStream && (
                <div className="absolute inset-0 bg-[#0B0F19] flex flex-col items-center justify-center text-xs text-gray-500 gap-2">
                  <VideoOff size={24} className="text-gray-600 animate-pulse" />
                  <span className="text-center font-medium">Waiting for peer...</span>
                  <span className="text-[10px] text-gray-600">Share your invite link to begin call</span>
                </div>
              )}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-[10px] text-gray-300 font-medium">
                Interviewer / Candidate
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Call Controls (Google Meet style) */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#111625]/90 border border-white/10 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-4 shadow-2xl">
        <button 
          onClick={toggleMute}
          className={`p-3 rounded-full border transition-all hover:scale-105 active:scale-95 ${
            isMuted 
              ? 'bg-red-500/20 border-red-500/30 text-red-400' 
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
          }`}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        <button 
          onClick={toggleVideo}
          className={`p-3 rounded-full border transition-all hover:scale-105 active:scale-95 ${
            isVideoOff 
              ? 'bg-red-500/20 border-red-500/30 text-red-400' 
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
          }`}
          title={isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
        >
          {isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>

        <button 
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          className={`p-3 rounded-full border transition-all hover:scale-105 active:scale-95 ${
            isScreenSharing 
              ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 font-bold' 
              : 'bg-white/5 border-white/10 hover:bg-white/10 text-gray-300'
          }`}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          <Monitor size={18} />
        </button>

        <div className="w-px h-6 bg-white/10 mx-1" />

        <button 
          onClick={() => navigate('/')}
          className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition-all hover:scale-105 active:scale-95"
          title="Exit Room"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};

export default RoomPage;
