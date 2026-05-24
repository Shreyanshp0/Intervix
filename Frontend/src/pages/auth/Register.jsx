import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import React from 'react';
import { ArrowRight, BriefcaseBusiness, Building2, Lock, Mail, User } from 'lucide-react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { getPortalHome, useAuthStore } from '../../store/useAuthStore';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['candidate', 'recruiter'], { message: 'Please choose a role' }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword']
});

const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuthStore();
  const [apiError, setApiError] = React.useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema)
  });

  const onSubmit = async (data) => {
    try {
      setApiError('');
      const user = await registerUser(data);
      navigate(getPortalHome(user));
    } catch (error) {
      setApiError(error.response?.data?.message || 'Failed to register. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden p-4">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold tracking-tighter inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <span className="text-white text-lg">I</span>
            </div>
            Intervix<span className="text-primary">.ai</span>
          </Link>
          <p className="text-gray-400">Choose your side of the recruitment ecosystem.</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">I am joining as</label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-4 transition has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                  <input type="radio" value="candidate" className="sr-only" {...register('role')} />
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <BriefcaseBusiness size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-white">Job Applicant</div>
                      <div className="text-xs text-gray-400">Candidate portal</div>
                    </div>
                  </div>
                </label>
                <label className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-4 transition has-[:checked]:border-accent has-[:checked]:bg-accent/10">
                  <input type="radio" value="recruiter" className="sr-only" {...register('role')} />
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div className="font-medium text-white">Job Provider</div>
                      <div className="text-xs text-gray-400">Recruiter portal</div>
                    </div>
                  </div>
                </label>
              </div>
              {errors.role?.message ? <p className="mt-2 text-sm text-red-400">{errors.role.message}</p> : null}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Input label="Full Name" icon={User} placeholder="John Doe" error={errors.name?.message} {...register('name')} />
              <Input label="Email Address" icon={Mail} type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
              <Input label="Password" icon={Lock} type="password" placeholder="********" error={errors.password?.message} {...register('password')} />
              <Input label="Confirm Password" icon={Lock} type="password" placeholder="********" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            </div>

            <Button type="submit" className="w-full mt-6 glow-effect" isLoading={isLoading}>
              Create Account <ArrowRight size={18} className="ml-2" />
            </Button>

            {apiError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg text-center mt-4">
                {apiError}
              </div>
            )}
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:text-primary transition-colors font-medium">
              Sign In
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
