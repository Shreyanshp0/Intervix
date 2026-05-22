import { create } from 'zustand';

export const useMockDataStore = create(() => ({
  // Candidate Dashboard Data
  upcomingInterviews: [
    { id: 1, type: 'Video', company: 'TechNova', role: 'Frontend Engineer', date: 'Oct 25, 2026', time: '10:00 AM' },
    { id: 2, type: 'Coding', company: 'GlobalSystems', role: 'Full Stack Developer', date: 'Oct 28, 2026', time: '2:30 PM' }
  ],
  mockHistory: [
    { id: 101, topic: 'React.js Architecture', score: 85, date: 'Oct 15, 2026' },
    { id: 102, topic: 'System Design', score: 72, date: 'Oct 10, 2026' },
    { id: 103, topic: 'Algorithms', score: 91, date: 'Oct 05, 2026' }
  ],
  skillProgress: [
    { name: 'React', value: 85 },
    { name: 'Node.js', value: 65 },
    { name: 'System Design', value: 50 },
    { name: 'Algorithms', value: 75 },
    { name: 'CSS/UI', value: 90 },
  ],
  
  // Recruiter Dashboard Data
  pipelineStats: {
    totalCandidates: 245,
    inReview: 85,
    interviewing: 42,
    offered: 12
  },
  recentCandidates: [
    { id: 'c1', name: 'Alice Smith', role: 'Backend Engineer', score: 92, status: 'Passed' },
    { id: 'c2', name: 'Bob Johnson', role: 'Frontend Developer', score: 68, status: 'Review' },
    { id: 'c3', name: 'Charlie Davis', role: 'Data Scientist', score: 85, status: 'Interviewing' },
  ],
  hiringFunnel: [
    { name: 'Applied', count: 500 },
    { name: 'Screening', count: 300 },
    { name: 'Interview', count: 150 },
    { name: 'Offer', count: 20 },
  ]
}));
