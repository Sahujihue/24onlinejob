import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sendEmailVerification, reload } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { Mail, RefreshCw, CheckCircle2, ArrowRight, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VerifyEmail() {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user?.emailVerified) {
      navigate('/dashboard');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleResendEmail = async () => {
    if (!user || countdown > 0) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await sendEmailVerification(user);
      setSuccess('Verification email sent successfully!');
      setCountdown(60); // Wait 60 seconds before allowing resend
    } catch (err: any) {
      setError(err.message || 'Failed to send verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      await reload(user);
      if (auth.currentUser?.emailVerified) {
        navigate('/dashboard');
      } else {
        setError('Email not verified yet. Please check your inbox.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check status.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-muted/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 bg-card p-8 rounded-2xl border shadow-xl text-center"
      >
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Mail className="text-primary" size={40} />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Verify Your Email</h1>
          <p className="text-muted-foreground">
            We've sent a verification link to <span className="font-semibold text-foreground">{user?.email}</span>. 
            Please check your inbox and click the link to activate your account.
          </p>
        </div>

        {(error || success) && (
          <div className={`p-3 rounded-lg text-sm font-medium border ${
            error ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
          }`}>
            {error || success}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleCheckStatus}
            disabled={loading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            I've Verified My Email
          </button>

          <button
            onClick={handleResendEmail}
            disabled={loading || countdown > 0}
            className="w-full bg-background border py-3 rounded-lg font-semibold hover:bg-accent transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={18} />
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Verification Email'}
          </button>
        </div>

        <div className="pt-6 border-t space-y-4">
          <p className="text-xs text-muted-foreground">
            Can't find the email? Check your spam folder or try resending.
          </p>
          <button 
            onClick={() => auth.signOut()}
            className="text-sm font-medium text-muted-foreground hover:text-primary flex items-center justify-center gap-2 mx-auto"
          >
            <LogOut size={16} />
            Sign out and try another email
          </button>
        </div>
      </motion.div>
    </div>
  );
}
