import { motion } from 'framer-motion';
import { useMockDataStore } from '../../store/useMockDataStore';
import { Users, UserCheck, Activity, Award } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="glass-card p-6 flex items-center justify-between">
    <div>
      <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
      <h3 className="text-3xl font-bold text-white">{value}</h3>
    </div>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClass}`}>
      <Icon size={24} />
    </div>
  </div>
);

const RecruiterDashboard = () => {
  const { pipelineStats, recentCandidates, hiringFunnel } = useMockDataStore();

  return (
    <div className="space-y-8 pb-12">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Candidates" value={pipelineStats.totalCandidates} icon={Users} colorClass="bg-primary/20 text-primary" />
        <StatCard title="In Review" value={pipelineStats.inReview} icon={Activity} colorClass="bg-warning/20 text-warning" />
        <StatCard title="Interviewing" value={pipelineStats.interviewing} icon={UserCheck} colorClass="bg-accent/20 text-accent" />
        <StatCard title="Offered" value={pipelineStats.offered} icon={Award} colorClass="bg-success/20 text-success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Hiring Funnel Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-xl font-semibold mb-6">Hiring Funnel</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hiringFunnel} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" horizontal={false} />
                <XAxis type="number" stroke="#888" axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#888" axisLine={false} tickLine={false} width={80} />
                <Tooltip 
                  cursor={{fill: '#2A303C'}}
                  contentStyle={{ backgroundColor: '#1A1F2C', borderColor: '#333', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {hiringFunnel.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#6366F1', '#A855F7', '#38BDF8', '#10B981'][index % 4]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Candidates List */}
        <div className="glass-card p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <button className="text-sm text-primary hover:text-indigo-400">View All</button>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto">
            {recentCandidates.map(candidate => (
              <div key={candidate.id} className="p-4 rounded-xl bg-surfaceHighlight/30 border border-white/5 flex justify-between items-center hover:bg-surfaceHighlight/50 transition-colors cursor-pointer">
                <div>
                  <h4 className="font-medium text-white">{candidate.name}</h4>
                  <p className="text-sm text-gray-400">{candidate.role}</p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-semibold ${candidate.score >= 80 ? 'text-success' : 'text-warning'}`}>
                    {candidate.score} / 100
                  </div>
                  <span className="text-xs text-gray-500">{candidate.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
