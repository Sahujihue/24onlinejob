import React, { useState, useEffect } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../firebase';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getAuthErrorMessage } from '../lib/error-messages';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Check your inbox for further instructions.');
      setCooldown(60); // Start 60s cooldown
    } catch (err: any) {
      setError(getAuthErrorMessage(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('A new link has been sent to your email.');
      setCooldown(60);
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
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="text-muted-foreground">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        {message && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100 flex items-center gap-3">
              <CheckCircle2 className="shrink-0" size={20} />
              {message}
            </div>

            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                Didn't receive the email?
              </p>
              <button
                onClick={handleResend}
                disabled={loading || cooldown > 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-primary/20 text-primary font-bold hover:bg-primary/5 transition-all disabled:opacity-50 disabled:grayscale"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <RotateCcw size={18} />
                )}
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Reset Link'}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="shrink-0" size={20} />
            {error}
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <div className="text-center">
          <Link 
            to="/auth" 
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
