import { useEffect, useState } from 'react';
import { Bot, ArrowRight, TrendingUp, Target, Trophy, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import Button from '../../components/common/Button';
import api from '../../services/api';

const CandidateDashboard = () => {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await api.get('/interviews/dashboard');
        setDashboard(response.data);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      }
    };

    void loadDashboard();
  }, []);

  const summaryCards = [
    { label: 'Total Interviews', value: dashboard?.totalInterviews || 0, icon: Bot },
    { label: 'Average Score', value: dashboard?.averageScore || 0, icon: TrendingUp },
    { label: 'Best Score', value: dashboard?.bestScore || 0, icon: Trophy },
    { label: 'Latest Score', value: dashboard?.latestScore || 0, icon: Sparkles },
    { label: 'Strongest Topic', value: dashboard?.strongestTopic || 'N/A', icon: Target },
    { label: 'Weakest Topic', value: dashboard?.weakestTopic || 'N/A', icon: Target },
  ];

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex flex-col justify-between group cursor-pointer hover:border-primary/50 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
              <Bot size={24} />
            </div>
            <ArrowRight size={20} className="text-gray-500 group-hover:text-primary transition-colors transform group-hover:translate-x-1" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">AI Mock Interview</h3>
            <p className="text-sm text-gray-400">Launch a timed adaptive assessment with a final report.</p>
          </div>
          <Link to="/interview/setup" className="mt-4">
            <Button variant="outline" className="w-full">Configure Interview</Button>
          </Link>
        </div>

        {summaryCards.slice(0, 2).map((card) => (
          <div key={card.label} className="glass-card p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center text-secondary">
                <card.icon size={22} />
              </div>
            </div>
            <div className="text-sm text-gray-400 mb-2">{card.label}</div>
            <div className="text-3xl font-semibold text-white">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="glass-card p-5">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-3">{card.label}</div>
            <div className="text-lg font-semibold text-white break-words">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="glass-card p-6 h-[320px]">
          <h2 className="text-xl font-semibold mb-6">Score Progression</h2>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dashboard?.scoreProgression || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="label" stroke="#888" tick={{ fill: '#888' }} axisLine={false} />
              <YAxis stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
              <Line type="monotone" dataKey="score" stroke="#6366F1" strokeWidth={3} dot={{ r: 4, fill: '#6366F1' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 h-[320px]">
          <h2 className="text-xl font-semibold mb-6">Topic-wise Performance</h2>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dashboard?.topicPerformance || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
              <XAxis dataKey="topic" stroke="#888" tick={{ fill: '#888', fontSize: 12 }} axisLine={false} />
              <YAxis stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', borderRadius: '8px' }} itemStyle={{ color: '#fff' }} />
              <Bar dataKey="averageScore" fill="#14B8A6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default CandidateDashboard;
