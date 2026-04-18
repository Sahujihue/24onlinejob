import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, Chrome, ArrowRight, Github, Eye, EyeOff, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { getAuthErrorMessage } from '../lib/error-messages';
import { updateProfile } from 'firebase/auth';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  React.useEffect(() => {
    if (!authLoading && user) {
      if (!user.emailVerified && !isLogin) {
        navigate('/verify-email');
      } else {
        navigate(redirect);
      }
    }
  }, [user, authLoading, navigate, redirect, isLogin]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      navigate(redirect);
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        navigate(redirect);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // Set display name
        if (name.trim()) {
          await updateProfile(userCredential.user, { displayName: name.trim() });
        }
        // Send verification email immediately after signup
        await sendEmailVerification(userCredential.user);
        // Redirect to verification page
        navigate('/verify-email');
      }
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-muted/30">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border shadow-xl"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="text-muted-foreground">
            {isLogin ? 'Sign in to access your saved jobs and alerts' : 'Join 24OnlineJob.com to start your global career'}
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full pl-10 pr-12 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {isLogin && (
              <div className="flex justify-end">
                <Link 
                  to="/forgot-password" 
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Sign Up'}
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleGoogleLogin}
            className="flex items-center justify-center gap-2 py-2.5 border rounded-lg hover:bg-accent transition-colors font-medium"
          >
            <Chrome size={18} />
            Google
          </button>
          <button
            className="flex items-center justify-center gap-2 py-2.5 border rounded-lg hover:bg-accent transition-colors font-medium"
          >
            <Github size={18} />
            GitHub
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-semibold hover:underline"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
