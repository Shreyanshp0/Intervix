import { useEffect, useState } from 'react';
import { Target, BookOpen, Star, Sparkles, HelpCircle, CheckSquare, Award, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Panel } from '../../components/jobs/JobUi';
import Button from '../../components/common/Button';

const PreparationHub = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const response = await api.get('/candidate/profile/me');
        setProfile(response.data.profile);
      } catch (err) {
        setError('Failed to load preparation metrics.');
      } finally {
        setLoading(false);
      }
    };
    void fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading preparation materials...</div>
      </div>
    );
  }

  const verifiedSkillsList = profile?.skills?.verified || [];
  const normalizedSkillsList = profile?.skills?.normalized || [];

  // Determine unverified skills (skills listed in normalized but not in verified)
  const unverifiedSkills = normalizedSkillsList.filter(s => !verifiedSkillsList.includes(s));

  return (
    <div className="space-y-6 pb-10 text-left">
      <Panel className="bg-[linear-gradient(135deg,rgba(15,23,42,0.95),rgba(99,102,241,0.15),rgba(2,6,23,0.95))] border-white/10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-indigo-200">
              <BookOpen size={14} />
              Preparation Hub
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">Target unverified skills with custom assessments</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Check unverified skills extracted directly from your resume, configure dynamic mock interview rounds, and bridge technical capability gaps.
            </p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Verification Checklist */}
        <div className="glass-card p-6 rounded-[28px] border border-white/5 space-y-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <CheckSquare size={18} className="text-primary" /> Core Skill Verification Checklist
          </h3>
          <p className="text-xs text-gray-400">
            Skills are marked as "Verified" when you score at least 60% in a timed AI assessment topic.
          </p>

          <div className="space-y-4">
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-2.5">Verified Skills</h5>
              <div className="flex flex-wrap gap-2.5">
                {verifiedSkillsList.map(skill => (
                  <span key={skill} className="rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-1.5 text-xs text-emerald-200 flex items-center gap-2">
                    <Award size={14} /> <span className="capitalize">{skill}</span>
                  </span>
                ))}
                {!verifiedSkillsList.length && (
                  <span className="text-xs text-gray-500 italic">No skills verified yet. Take an assessment below!</span>
                )}
              </div>
            </div>

            <div className="pt-2">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2.5">Claimed but Unverified Gaps</h5>
              <div className="flex flex-wrap gap-2.5">
                {unverifiedSkills.map(skill => (
                  <span key={skill} className="rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs text-gray-300 flex items-center gap-2">
                    <HelpCircle size={14} className="text-gray-400" /> <span className="capitalize">{skill}</span>
                  </span>
                ))}
                {!unverifiedSkills.length && (
                  <span className="text-xs text-gray-500 italic">All claimed skills are verified! Outstanding.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Launch Mock assessments */}
        <div className="glass-card p-6 rounded-[28px] border border-white/5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target size={18} className="text-primary" /> Target Verification Drills
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Dynamically spawn a technical interviewer round focusing on any unverified skill to immediately log verified credentials.
            </p>
          </div>

          <div className="space-y-3 mt-4">
            {unverifiedSkills.slice(0, 3).map(skill => (
              <div key={skill} className="flex justify-between items-center p-3.5 rounded-2xl bg-white/5 border border-white/5">
                <span className="text-xs font-semibold text-white capitalize">{skill} Assessment</span>
                <Link to="/candidate/interview/setup">
                  <button className="h-8 w-8 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 flex items-center justify-center transition-colors">
                    <ArrowRight size={16} />
                  </button>
                </Link>
              </div>
            ))}
          </div>

          <Link to="/candidate/interview/setup" className="mt-5 block w-full">
            <Button className="w-full gap-2">
              Launch Custom Simulator <Sparkles size={16} />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PreparationHub;
