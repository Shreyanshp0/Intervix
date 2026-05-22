import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import api from '../../services/api';

const AnalyticsPage = () => {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await api.get('/interviews/dashboard');
        setDashboard(response.data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      }
    };

    void loadAnalytics();
  }, []);

  const radarData = (dashboard?.topicPerformance || []).slice(0, 6).map((entry) => ({
    subject: entry.topic,
    value: entry.averageScore,
  }));

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-3xl font-bold mb-2">Analytics & Reports</h1>
        <p className="text-gray-400">Track performance over time, confidence trends, and the topics that need the most attention.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="glass-card p-6 h-[360px]">
          <h2 className="text-xl font-semibold mb-6">Score Progression</h2>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dashboard?.scoreProgression || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="label" stroke="#888" tick={{ fill: '#888' }} axisLine={false} />
              <YAxis stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={3} />
              <Line type="monotone" dataKey="technicalScore" stroke="#14B8A6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 h-[360px]">
          <h2 className="text-xl font-semibold mb-6">Confidence Trend</h2>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dashboard?.confidenceTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="label" stroke="#888" tick={{ fill: '#888' }} axisLine={false} />
              <YAxis stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', borderRadius: '8px' }} />
              <Line type="monotone" dataKey="confidence" stroke="#F59E0B" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="glass-card p-6 h-[360px]">
          <h2 className="text-xl font-semibold mb-6">Topic Radar</h2>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#333" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#888', fontSize: 12 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: '#555' }} />
              <Radar dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 h-[360px]">
          <h2 className="text-xl font-semibold mb-6">Improvement Graph</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard?.improvementGraph || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="label" stroke="#888" tick={{ fill: '#888' }} axisLine={false} />
              <YAxis stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', borderRadius: '8px' }} />
              <Bar dataKey="score" fill="#10B981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="movingAverage" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card p-6 border-l-4 border-l-secondary">
        <h3 className="text-lg font-semibold mb-3">Learning Recommendations</h3>
        <div className="space-y-3">
          {(dashboard?.learningRecommendations || []).map((recommendation) => (
            <div key={recommendation} className="rounded-xl bg-surfaceHighlight/60 border border-white/5 px-4 py-3 text-gray-200">
              {recommendation}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
