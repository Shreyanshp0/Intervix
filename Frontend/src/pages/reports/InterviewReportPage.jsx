import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { FileText, Briefcase, ArrowLeft, Download, MessageSquareQuote } from 'lucide-react';
import Button from '../../components/common/Button';
import api from '../../services/api';

const InterviewReportPage = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await api.get(`/interviews/${sessionId}/report`);
        setReport(response.data.report);
      } catch (error) {
        console.error('Failed to load report:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchReport();
  }, [sessionId]);

  if (loading) {
    return <div className="text-sm text-gray-400">Loading report...</div>;
  }

  if (!report) {
    return <div className="text-sm text-red-300">Unable to load the interview report.</div>;
  }

  const scoreCards = [
    { label: 'Overall', value: report.score },
    { label: 'Technical', value: report.technicalScore },
    { label: 'Communication', value: report.communicationScore },
    { label: 'Confidence', value: report.confidenceScore },
  ];

  const radarData = [
    { metric: 'Technical', value: report.technicalScore || 0 },
    { metric: 'Communication', value: report.communicationScore || 0 },
    { metric: 'Confidence', value: report.confidenceScore || 0 },
    { metric: 'Problem Solving', value: report.problemSolvingScore || 0 },
    { metric: 'Depth', value: report.depthScore || 0 },
  ];

  const transcriptData = (report.transcript || []).map((entry, index) => ({
    name: `Q${index + 1}`,
    score: entry.score || 0,
  }));

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Final Interview Report</h1>
          <p className="text-gray-400">{location.state?.automatic ? 'The interview ended automatically when the timer expired.' : 'Assessment completed and scored successfully.'}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} className="mr-2" /> Dashboard
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Download size={16} className="mr-2" /> Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {scoreCards.map((card) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5">
            <p className="text-sm text-gray-400 mb-2">{card.label} Score</p>
            <div className="text-3xl font-semibold text-white">{card.value || 0}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={18} className="text-primary" />
            <h2 className="text-xl font-semibold">Hiring Readiness</h2>
          </div>
          <div className="text-lg text-emerald-200 mb-3">{report.hiringReadiness}</div>
          <p className="text-gray-300 leading-relaxed">{report.finalSummary}</p>
        </div>

        <div className="glass-card p-6 h-[360px]">
          <h2 className="text-xl font-semibold mb-4">Assessment Dimensions</h2>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#cbd5e1', fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#64748b' }} />
              <Radar dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Strengths</h2>
          <div className="space-y-3">
            {(report.strengths || []).map((item) => (
              <div key={item} className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-emerald-100">{item}</div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Weaknesses</h2>
          <div className="space-y-3">
            {(report.weaknesses || []).map((item) => (
              <div key={item} className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-red-100">{item}</div>
            ))}
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Suggestions</h2>
          <div className="space-y-3">
            {(report.suggestions || []).map((item) => (
              <div key={item} className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-3 text-blue-50">{item}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="glass-card p-6 h-[340px]">
          <h2 className="text-xl font-semibold mb-4">Question-by-Question Performance</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={transcriptData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2f3541" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #334155' }} />
              <Bar dataKey="score" fill="#14B8A6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-4">Recommended Study Topics</h2>
          <div className="flex flex-wrap gap-3 mb-6">
            {(report.recommendedStudyTopics || []).map((topic) => (
              <span key={topic} className="rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
                {topic}
              </span>
            ))}
          </div>
          <div className="rounded-2xl border border-white/10 bg-surfaceHighlight p-5">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquareQuote size={18} className="text-secondary" />
              <h3 className="font-semibold">Assessment Notes</h3>
            </div>
            <p className="text-gray-300 leading-relaxed">{report.finalSummary}</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-6">
          <FileText size={18} className="text-primary" />
          <h2 className="text-xl font-semibold">Full Transcript</h2>
        </div>
        <div className="space-y-5">
          {(report.transcript || []).map((entry, index) => (
            <div key={`${entry.question}-${index}`} className="rounded-2xl border border-white/10 bg-surfaceHighlight/60 p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div className="text-sm uppercase tracking-[0.2em] text-gray-500">Question {index + 1}</div>
                <div className="text-sm text-emerald-300">Score: {entry.score || 0}</div>
              </div>
              <div className="text-white font-medium mb-3">{entry.question}</div>
              <div className="text-gray-300 mb-4 whitespace-pre-wrap">{entry.answer || 'No answer submitted.'}</div>
              <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-blue-50">{entry.feedback || 'No per-question feedback available.'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InterviewReportPage;
