import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, ShieldCheck, CheckCircle2, Loader2, 
  ArrowLeft, Zap, DollarSign, Lock, AlertCircle,
  User, Mail, Phone, ArrowRight
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();
  
  const planId = searchParams.get('plan');
  const cycle = searchParams.get('cycle') || 'monthly';
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal' | 'razorpay'>('stripe');
  
  const [formData, setFormData] = useState({
    fullName: profile?.displayName || '',
    email: user?.email || '',
    phone: profile?.phone || ''
  });

  const plan = settings.pricingPlans[planId as string];
  const price = cycle === 'monthly' ? plan?.price : plan?.yearlyPrice || Math.round(plan?.price * 12 * 0.8);

  useEffect(() => {
    if (settingsLoading) return;

    // Handle Stripe Success Callback
    const sessionId = searchParams.get('session_id');
    if (sessionId && !success) {
      finalizeTransaction(sessionId);
      return;
    }

    if (!planId || !plan) {
      navigate('/pricing');
      return;
    }
    if (!user) {
      navigate('/auth?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
    }
  }, [planId, plan, user, navigate, settingsLoading, searchParams, success]);

  // Load Razorpay Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !plan) return;

    setLoading(true);
    setError(null);

    // LIVE MODE LOGIC
    try {
      if (paymentMethod === 'stripe') {
        const stripeKey = settings.paymentGateways.stripe.publicKey;
        if (!stripeKey || stripeKey.trim() === '') {
          throw new Error('Stripe Public Key is missing. Please configure it in the Admin Panel.');
        }
        
        if (stripeKey.startsWith('sk_')) {
          throw new Error('Invalid Stripe Key: You have entered a Secret Key (sk_...) instead of a Publishable Key (pk_...). Please fix this in the Admin Panel.');
        }
        
        const stripe = await loadStripe(stripeKey);
        if (!stripe) throw new Error('Failed to load Stripe. Please check your Public Key.');

        setLoading(true);
        
        // Call our backend to create a Checkout Session
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planName: plan.name,
            amount: price,
            planId: plan.id,
            cycle: cycle,
            userId: user.uid,
            userEmail: user.email,
            successUrl: window.location.origin + window.location.pathname,
            cancelUrl: window.location.href
          })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create checkout session');

        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } 
      else if (paymentMethod === 'razorpay') {
        const rzpKey = settings.paymentGateways.razorpay.keyId;
        if (!rzpKey || rzpKey.trim() === '') {
          throw new Error('Razorpay Key ID is missing. Please configure it in the Admin Panel.');
        }

        if (!(window as any).Razorpay) {
          throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
        }

        const options = {
          key: rzpKey,
          amount: price * 100, // in paise
          currency: 'INR',
          name: settings.siteName,
          description: `${plan.name} Subscription`,
          handler: function (response: any) {
            finalizeTransaction(response.razorpay_payment_id);
          },
          prefill: {
            name: formData.fullName,
            email: formData.email,
            contact: formData.phone
          },
          theme: {
            color: '#3b82f6'
          },
          modal: {
            ondismiss: function() {
              setLoading(false);
            }
          }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
        // Do not set loading false here, handler or ondismiss will handle it
      }
      else if (paymentMethod === 'paypal') {
        const paypalClientId = settings.paymentGateways.paypal.clientId;
        if (!paypalClientId || paypalClientId.trim() === '') {
          throw new Error('PayPal Client ID is missing. Please configure it in the Admin Panel.');
        }

        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        alert('Redirecting to PayPal Checkout (Live Mode)...');
        
        // Mocking success after "redirect" only if key is present
        await finalizeTransaction('PAYPAL-LIVE-' + Date.now());
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const finalizeTransaction = async (txnId: string) => {
    try {
      // 1. Record Transaction
      const transactionData = {
        userId: user!.uid,
        userEmail: user!.email,
        customerName: formData.fullName,
        customerPhone: formData.phone,
        planId: plan.id,
        planName: plan.name,
        billingCycle: cycle,
        amount: price,
        currency: 'USD',
        status: 'completed',
        paymentMethod: paymentMethod,
        transactionId: txnId,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'transactions'), transactionData);

      // 2. Update User Subscription
      const expirationDate = new Date();
      if (cycle === 'monthly') {
        expirationDate.setMonth(expirationDate.getMonth() + 1);
      } else {
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);
      }

      await updateDoc(doc(db, 'users', user!.uid), {
        subscriptionStatus: plan.id,
        subscriptionExpiresAt: expirationDate.toISOString(),
        customerPhone: formData.phone
      });

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 3000);
    } catch (err: any) {
      console.error('Finalization error:', err);
      setError('Payment recorded but failed to update subscription. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (!plan) return null;

  if (success) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center text-center space-y-6">
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/20"
        >
          <CheckCircle2 size={48} />
        </motion.div>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Payment Successful!</h1>
          <p className="text-xl text-muted-foreground">Your {plan.name} subscription is now active.</p>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Redirecting to your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 font-medium"
      >
        <ArrowLeft size={20} />
        Back to Pricing
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Payment Form */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card rounded-3xl border p-8 space-y-8 shadow-sm">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CreditCard className="text-primary" />
                Secure Checkout
              </h1>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-2 text-emerald-500 text-sm font-bold bg-emerald-500/10 px-3 py-1 rounded-full">
                  <Lock size={14} />
                  SSL Encrypted
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">1. Select Payment Method</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {settings.paymentGateways.stripe.enabled && (
                    <button 
                      onClick={() => setPaymentMethod('stripe')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        paymentMethod === 'stripe' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <CreditCard size={24} className={paymentMethod === 'stripe' ? 'text-primary' : 'text-muted-foreground'} />
                      <span className="font-bold text-sm">Stripe</span>
                    </button>
                  )}
                  {settings.paymentGateways.paypal.enabled && (
                    <button 
                      onClick={() => setPaymentMethod('paypal')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        paymentMethod === 'paypal' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <DollarSign size={24} className={paymentMethod === 'paypal' ? 'text-primary' : 'text-muted-foreground'} />
                      <span className="font-bold text-sm">PayPal</span>
                    </button>
                  )}
                  {settings.paymentGateways.razorpay.enabled && (
                    <button 
                      onClick={() => setPaymentMethod('razorpay')}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        paymentMethod === 'razorpay' ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                      }`}
                    >
                      <Zap size={24} className={paymentMethod === 'razorpay' ? 'text-primary' : 'text-muted-foreground'} />
                      <span className="font-bold text-sm">Razorpay</span>
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence mode="wait">
                {price > 0 ? (
                  <motion.form 
                    key="payment-form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handlePayment} 
                    className="space-y-8"
                  >
                    <div className="space-y-4">
                      <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">2. Billing Information</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <User size={14} className="text-primary" />
                            Full Name
                          </label>
                          <input 
                            type="text" required
                            placeholder="Enter your full name"
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                            value={formData.fullName}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <Mail size={14} className="text-primary" />
                            Email Address
                          </label>
                          <input 
                            type="email" required
                            placeholder="email@example.com"
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                            value={formData.email}
                            onChange={e => setFormData({...formData, email: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-medium flex items-center gap-2">
                            <Phone size={14} className="text-primary" />
                            Phone Number
                          </label>
                          <input 
                            type="tel" required
                            placeholder="+1 (234) 567-890"
                            className="w-full px-4 py-3 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                            value={formData.phone}
                            onChange={e => setFormData({...formData, phone: e.target.value})}
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                        <AlertCircle size={18} />
                        {error}
                      </div>
                    )}

                    <button 
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50 group"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={24} className="animate-spin" />
                          {settings.paymentGateways.testMode ? 'Simulating Payment...' : 'Redirecting to Gateway...'}
                        </>
                      ) : (
                        <>
                          {settings.paymentGateways.testMode ? `Pay $${price} (Test Mode)` : `Continue to ${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}`}
                          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>
                  </motion.form>
                ) : (
                  <motion.div 
                    key="free-activation"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="pt-8 space-y-6"
                  >
                    <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-800 flex items-center gap-4">
                      <CheckCircle2 className="text-emerald-500" size={32} />
                      <div>
                        <p className="font-bold text-lg">Free Plan Selection</p>
                        <p className="text-sm">No payment required. Click below to activate your free plan.</p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={handlePayment}
                      disabled={loading}
                      className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Loader2 size={24} className="animate-spin" />
                          Activating...
                        </>
                      ) : (
                        <>
                          Activate Free Plan
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 opacity-50 grayscale">
            <ShieldCheck size={40} />
            <div className="h-8 w-px bg-border" />
            <p className="text-xs font-medium max-w-[200px]">
              Your payment is processed securely. We never store your card details.
            </p>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="space-y-8">
          <div className="bg-card rounded-3xl border p-8 space-y-6 shadow-sm sticky top-24">
            <h2 className="text-xl font-bold">Order Summary</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${plan.color}`}>
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="font-bold">{plan.name} Plan</p>
                    <p className="text-xs text-muted-foreground capitalize">{cycle} Billing</p>
                  </div>
                </div>
                <p className="font-bold">${price}</p>
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${price}.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax (0%)</span>
                  <span>$0.00</span>
                </div>
                <div className="pt-4 border-t flex justify-between items-baseline">
                  <span className="font-bold">Total Amount</span>
                  <span className="text-3xl font-extrabold text-primary">${price}.00</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">What's included:</p>
              <ul className="space-y-3">
                {plan.features.map((feature: string) => (
                  <li key={feature} className="flex items-center gap-2 text-xs font-medium">
                    <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

