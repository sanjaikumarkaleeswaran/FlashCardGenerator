import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { authService } from '../services/api';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if redirected from a successful registration
  const wasRegistered = location.state?.registered;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.login(email, password);
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.detail || 
        'Invalid email or password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-205">
      <Card 
        glass={true} 
        className="max-w-md w-full p-8 sm:p-10 shadow-2xl bg-white/80 dark:bg-slate-900/80 border-slate-200/80 dark:border-slate-800/80 animate-slide-up relative overflow-hidden"
      >
        {/* Decorative corner glows */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100/50 dark:border-indigo-900/40">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome Back
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Log in to access your dashboard and flashcards.
          </p>
        </div>

        {wasRegistered && !error && (
          <div className="mt-6 flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl text-xs font-semibold">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>Account created successfully! Please log in.</span>
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-center space-x-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-450 p-4 rounded-2xl text-xs font-semibold">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              icon={Mail}
            />

            <Input
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              icon={Lock}
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full py-4 text-sm font-extrabold h-14 shadow-lg shadow-indigo-500/10"
              isLoading={isLoading}
              icon={LogIn}
            >
              Log In
            </Button>
          </div>
        </form>

        <div className="text-center pt-6 border-t border-slate-100 dark:border-slate-800/80 mt-6">
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-bold text-indigo-650 dark:text-indigo-400 hover:underline transition-all"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Login;
