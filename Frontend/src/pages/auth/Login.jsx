import { useForm as useReactHookForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useAuthStore } from '../../store/useAuthStore';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

const Login = () => {
  const navigate = useNavigate();
  const { login: loginUser, isLoading } = useAuthStore();
  const [apiError, setApiError] = React.useState('');
  
  const { register, handleSubmit, formState: { errors } } = useReactHookForm({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data) => {
    try {
      setApiError('');
      await loginUser(data);
      navigate('/dashboard');
    } catch (error) {
      console.error(error);
      setApiError(error.response?.data?.message || 'Failed to sign in. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden p-4">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold tracking-tighter inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white text-lg">I</span>
            </div>
            Intervix<span className="text-primary">.ai</span>
          </Link>
          <p className="text-gray-400">Welcome back. Ready to practice?</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label="Email Address"
              icon={Mail}
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            
            <div className="space-y-1">
              <Input
                label="Password"
                icon={Lock}
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-primary hover:text-indigo-400 transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full mt-6 glow-effect" isLoading={isLoading}>
              Sign In <ArrowRight size={18} className="ml-2" />
            </Button>

            {apiError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center mt-4">
                {apiError}
              </div>
            )}
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-white hover:text-primary transition-colors font-medium">
              Create one
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
