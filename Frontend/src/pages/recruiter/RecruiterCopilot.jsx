import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, ArrowRight, Table, List, Award, CornerDownLeft } from 'lucide-react';
import api from '../../services/api';
import { API_ROUTES } from '../../constants/apiRoutes';
import { Panel } from '../../components/jobs/JobUi';

// Custom Markdown to React Element Parser
const parseMarkdownToReact = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let tableRows = [];
  let tableHeader = null;
  let inTable = false;
  let inList = false;
  let listItems = [];

  const flushList = (key) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${key}`} className="list-disc pl-5 my-2 space-y-1 text-gray-300">
          {listItems}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  const flushTable = (key) => {
    if (tableRows.length > 0 && tableHeader) {
      elements.push(
        <div key={`table-wrapper-${key}`} className="overflow-x-auto my-4 rounded-xl border border-white/10 bg-slate-950/80">
          <table className="min-w-full divide-y divide-white/10 text-xs">
            <thead className="bg-white/5">
              <tr>
                {tableHeader.map((th, i) => (
                  <th key={`th-${i}`} className="px-4 py-3 text-left font-bold text-gray-200 uppercase tracking-wider">
                    {th}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tableRows.map((row, rIdx) => (
                <tr key={`tr-${rIdx}`} className="hover:bg-white/5 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={`td-${rIdx}-${cIdx}`} className="px-4 py-3 text-gray-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      tableHeader = null;
    }
    inTable = false;
  };

  const processInlineFormatting = (inlineText) => {
    // Basic bold formatting support (**text**)
    const parts = inlineText.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="text-white font-bold">{part}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check for tables
    if (trimmed.startsWith('|')) {
      flushList(index);
      inTable = true;
      const cells = trimmed
        .split('|')
        .map((c) => c.trim())
        .filter((c, i, arr) => i > 0 && i < arr.length - 1);

      // Skip separator row (e.g. |---|---|)
      if (cells.every((c) => c.startsWith('-'))) {
        return;
      }

      if (!tableHeader) {
        tableHeader = cells.map(c => c.replace(/\*\*/g, ''));
      } else {
        tableRows.push(cells.map(c => processInlineFormatting(c)));
      }
      return;
    } else if (inTable) {
      flushTable(index);
    }

    // Check for bullet lists
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      inList = true;
      const content = trimmed.substring(1).trim();
      listItems.push(
        <li key={`li-${index}`} className="text-xs text-gray-300 leading-relaxed">
          {processInlineFormatting(content)}
        </li>
      );
      return;
    } else if (inList) {
      flushList(index);
    }

    // Check for headers
    if (trimmed.startsWith('###')) {
      const content = trimmed.substring(3).trim();
      elements.push(
        <h4 key={index} className="text-sm font-bold text-cyan-300 mt-4 mb-2 flex items-center gap-1.5 uppercase tracking-wide">
          <Award size={14} className="text-cyan-400" /> {processInlineFormatting(content)}
        </h4>
      );
    } else if (trimmed.startsWith('##')) {
      const content = trimmed.substring(2).trim();
      elements.push(
        <h3 key={index} className="text-base font-bold text-white mt-6 mb-3 border-b border-white/5 pb-2 uppercase tracking-wider flex items-center gap-2">
          <Sparkles size={16} className="text-cyan-400" /> {processInlineFormatting(content)}
        </h3>
      );
    } else if (trimmed.startsWith('#')) {
      const content = trimmed.substring(1).trim();
      elements.push(
        <h2 key={index} className="text-lg font-bold text-white mt-6 mb-4">
          {processInlineFormatting(content)}
        </h2>
      );
    } else if (trimmed) {
      elements.push(
        <p key={index} className="text-xs text-gray-300 leading-relaxed my-2">
          {processInlineFormatting(trimmed)}
        </p>
      );
    } else {
      elements.push(<div key={index} className="h-2" />);
    }
  });

  // Flush remaining blocks
  flushList('final');
  flushTable('final');

  return <div className="space-y-1">{elements}</div>;
};

const SUGGESTED_QUERIES = [
  {
    title: 'Match candidates for Node',
    query: 'Show me candidates with strong Node.js or Javascript experience, high verified skills score, and list their resume summaries in a comparison table.',
    icon: Table
  },
  {
    title: 'Rank by verified score',
    query: 'Identify the candidates with the highest verified score ratings, detail their strengths, and recommend next steps.',
    icon: Award
  },
  {
    title: 'Pipeline suitability audit',
    query: 'Analyze candidates suitable for a Lead Engineer opening. Rank them clearly, highlighting top technical matches vs communication skills.',
    icon: List
  }
];

const RecruiterCopilot = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Welcome to the **Intervix Recruiter AI Copilot**. I analyze all candidate resumes, technical scores, verified skills, and job profiles in real time. Ask me to rank applicants, compare credentials, or explain fit metrics!'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    // Clear input
    if (!queryText) setInputQuery('');

    // Append User Message
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text: textToSend }]);
    setLoading(true);

    try {
      const response = await api.post(API_ROUTES.recruiter.copilot, { query: textToSend });
      const botMsgId = `bot-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: 'bot',
          text: response.data.explanation || 'I could not retrieve an explanation. Try phrasing your match query differently.'
        }
      ]);
    } catch (err) {
      const errMsgId = `error-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: errMsgId,
          sender: 'bot',
          text: `**Error**: ${err.response?.data?.message || 'AI Copilot failed to connect. Ensure your environment configurations are synced.'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      void handleSend();
    }
  };

  return (
    <div className="space-y-6 pb-10 text-left">
      {/* Header Banner */}
      <Panel className="bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(20,184,166,0.15),rgba(2,6,23,0.95))] border-white/10 shrink-0">
        <div className="flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-teal-200 w-fit">
          <Bot size={14} />
          AI Recruiter Copilot
        </div>
        <h1 className="mt-4 text-3xl font-semibold text-white">Recruitment Pipeline Intelligence Engine</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          Conduct conversational analysis on your candidate stack. Rank matches, screen competencies, compile cross-tables, and draft expert summaries in seconds.
        </p>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Central Chat Interface */}
        <div className="glass-card rounded-[28px] border border-white/5 bg-slate-900/40 backdrop-blur-xl flex flex-col h-[650px] overflow-hidden">
          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-4 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse text-right' : 'mr-auto text-left'
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    msg.sender === 'user'
                      ? 'bg-accent/10 border-accent/20 text-accent'
                      : 'bg-primary/10 border-primary/20 text-primary'
                  }`}
                >
                  {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>

                <div
                  className={`rounded-2xl px-5 py-4 border ${
                    msg.sender === 'user'
                      ? 'bg-accent/5 border-accent/15 text-gray-200 rounded-tr-none'
                      : 'bg-slate-950/80 border-white/5 text-gray-300 rounded-tl-none'
                  }`}
                >
                  {msg.sender === 'bot' ? (
                    parseMarkdownToReact(msg.text)
                  ) : (
                    <span className="text-xs">{msg.text}</span>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-4 max-w-[85%] mr-auto text-left">
                <div className="h-9 w-9 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20 text-primary shrink-0">
                  <Bot size={16} className="animate-spin" />
                </div>
                <div className="rounded-2xl px-5 py-4 bg-slate-950/80 border border-white/5 text-xs text-gray-400 rounded-tl-none animate-pulse">
                  Copilot is parsing candidate records and formatting fit breakdowns...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Interactive Chat Input Area */}
          <div className="p-4 bg-slate-950/80 border-t border-white/5 shrink-0 flex items-center gap-3">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={loading}
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
              placeholder="Ask copilot: 'Who has React experience and an ATS score > 80%?'"
            />
            <button
              onClick={() => void handleSend()}
              disabled={loading || !inputQuery.trim()}
              className="h-12 w-12 rounded-2xl bg-teal-500 text-slate-950 hover:bg-teal-400 transition-all flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send size={18} />
            </button>
          </div>
        </div>

        {/* Sidebar: Suggested Prompt Badges */}
        <div className="space-y-6">
          <div className="glass-card p-6 rounded-[28px] border border-white/5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-teal-400" size={18} />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Suggested Queries</h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Click any matching template to immediately launch the AI parsing pipeline and compare your pool.
            </p>

            <div className="space-y-3 pt-2">
              {SUGGESTED_QUERIES.map((badge, idx) => {
                const Icon = badge.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => void handleSend(badge.query)}
                    disabled={loading}
                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-teal-500/20 text-left space-y-2 group transition-all disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-teal-400 flex items-center gap-1.5">
                        <Icon size={12} /> {badge.title}
                      </span>
                      <CornerDownLeft size={10} className="text-gray-500 group-hover:text-teal-400 transition-colors" />
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed truncate group-hover:text-white transition-colors">
                      {badge.query}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterCopilot;
