import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, CheckSquare, Terminal, Layout } from 'lucide-react';
import Button from '../../components/common/Button';

const CodingInterview = () => {
  const [code, setCode] = useState('function twoSum(nums, target) {\n  // Write your code here\n}');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  // TODO: Connect Judge0 API for code execution
  // TODO: Implement Yjs or Socket.io for collaborative cursor sync

  const handleRunCode = () => {
    setIsRunning(true);
    setTimeout(() => {
      setOutput('Running test cases...\nTest Case 1: Passed (12ms)\nTest Case 2: Passed (15ms)\n\nAll tests passed successfully.');
      setIsRunning(false);
    }, 1500);
  };

  return (
    <div className="h-screen bg-[#0B0F19] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-surface/50">
        <div className="flex items-center gap-4">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-xs font-bold">JS</div>
          <h1 className="font-medium text-gray-200">Two Sum</h1>
          <span className="px-2 py-0.5 rounded text-xs bg-green-500/20 text-green-400 border border-green-500/20">Easy</span>
        </div>
        
        <div className="flex items-center gap-3">
          <select className="bg-surfaceHighlight border border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none">
            <option>JavaScript</option>
            <option>Python</option>
            <option>Java</option>
            <option>C++</option>
          </select>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <Button variant="secondary" size="sm" onClick={handleRunCode} isLoading={isRunning}>
            <Play size={16} className="mr-2" /> Run
          </Button>
          <Button size="sm" className="glow-effect bg-green-600 hover:bg-green-500 shadow-[0_0_15px_rgba(22,163,74,0.4)]">
            <CheckSquare size={16} className="mr-2" /> Submit
          </Button>
        </div>
      </header>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Problem Statement */}
        <div className="w-1/3 border-r border-white/5 flex flex-col bg-surface/30">
          <div className="h-10 border-b border-white/5 flex items-center px-4 bg-surfaceHighlight/50 text-sm font-medium text-gray-300">
            <Layout size={16} className="mr-2 text-primary" /> Problem Description
          </div>
          <div className="flex-1 overflow-y-auto p-6 prose prose-invert prose-sm">
            <p>Given an array of integers <code>nums</code> and an integer <code>target</code>, return indices of the two numbers such that they add up to <code>target</code>.</p>
            <p>You may assume that each input would have exactly one solution, and you may not use the same element twice.</p>
            <p>You can return the answer in any order.</p>
            
            <div className="mt-6 bg-surfaceHighlight/30 p-4 rounded-xl border border-white/5 font-mono text-sm">
              <p className="text-gray-400 mb-1">Example 1:</p>
              <p><span className="text-primary">Input:</span> nums = [2,7,11,15], target = 9</p>
              <p><span className="text-primary">Output:</span> [0,1]</p>
              <p><span className="text-primary">Explanation:</span> Because nums[0] + nums[1] == 9, we return [0, 1].</p>
            </div>
          </div>
        </div>

        {/* Right Panel: Editor & Console */}
        <div className="flex-1 flex flex-col">
          {/* Editor */}
          <div className="flex-1 relative pt-2">
            <Editor
              height="100%"
              defaultLanguage="javascript"
              theme="vs-dark"
              value={code}
              onChange={setCode}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                lineHeight: 24,
                padding: { top: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on"
              }}
            />
          </div>

          {/* Console Output */}
          <div className="h-48 border-t border-white/5 bg-[#1E1E1E] flex flex-col">
            <div className="h-8 bg-[#252526] border-b border-black/20 flex items-center px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
              <Terminal size={14} className="mr-2" /> Console Output
            </div>
            <div className="flex-1 p-4 font-mono text-sm overflow-y-auto text-gray-300 whitespace-pre-wrap">
              {output || 'Run your code to see output here.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodingInterview;
