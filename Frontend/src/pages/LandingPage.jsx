import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../components/common/Button';
import { ArrowRight, Bot, Code, Video, Sparkles } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-blob pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 rounded-full blur-[120px] animate-blob animation-delay-2000 pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[20%] w-[40%] h-[40%] bg-accent/20 rounded-full blur-[120px] animate-blob animation-delay-4000 pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 glass-panel border-b border-white/5">
        <div className="text-2xl font-bold tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <span className="text-white text-lg">I</span>
          </div>
          Intervix<span className="text-primary">.ai</span>
        </div>
        <div className="flex gap-4">
          <Link to="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link to="/register">
            <Button className="glow-effect">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-sm text-gray-300 mb-4 backdrop-blur-md">
            <Sparkles size={16} className="text-accent" />
            <span>Next-Generation AI Interview Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white leading-tight">
            Master the interview. <br />
            <span className="text-gradient">Secure the offer.</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Experience highly realistic, adaptive AI mock interviews in Voice and Text modes. Practice collaborative coding or engage in 1-on-1 live video sessions.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link to="/register">
              <Button size="lg" className="w-full sm:w-auto text-lg gap-2 glow-effect">
                Start Practicing Free <ArrowRight size={20} />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto text-lg">
                For Recruiters
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-32 px-4">
          {[
            { title: 'AI Mock Interviews', icon: Bot, desc: 'Hyper-realistic AI interviewer that adapts to your answers in real-time. Text or Voice.' },
            { title: 'Collaborative Coding', icon: Code, desc: 'Real-time code execution, AI hints, and collaborative IDE for technical rounds.' },
            { title: 'Live Video Sessions', icon: Video, desc: 'High-quality WebRTC video rooms for 1-on-1 real interviews with recruiters.' }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.2 + 0.5 }}
              className="glass-card p-8 text-left hover:-translate-y-2 transition-transform duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-6">
                <feature.icon size={24} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
              <p className="text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
