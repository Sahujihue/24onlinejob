import React from 'react';
import { CheckCircle2, ShieldCheck, CreditCard, DollarSign, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';

export default function Pricing() {
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');
  const plans = (Object.values(settings.pricingPlans) as any[]).sort((a, b) => a.price - b.price);

  return (
    <div className="container mx-auto px-4 py-20 space-y-20">
      <div className="text-center max-w-3xl mx-auto space-y-8">
        <div className="space-y-4">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-extrabold tracking-tight"
          >
            Simple, Transparent <span className="text-primary">Pricing</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground leading-relaxed"
          >
            Choose the plan that's right for your business. Whether you're hiring for one role or building a whole team, we've got you covered.
          </motion.p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm font-bold transition-colors ${billingCycle === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
          <button 
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className={`w-14 h-7 rounded-full relative p-1 transition-all duration-300 ${
              billingCycle === 'yearly' ? 'bg-primary' : 'bg-muted-foreground/40'
            }`}
          >
            <motion.div 
              animate={{ x: billingCycle === 'monthly' ? 0 : 28 }}
              className="w-5 h-5 rounded-full bg-background shadow-lg border border-border"
            />
          </button>
          <span className={`text-sm font-bold transition-colors ${billingCycle === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>
            Yearly <span className="text-emerald-500 text-xs ml-1">(Save 20%)</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.map((plan, index) => {
          const price = billingCycle === 'monthly' ? plan.price : plan.yearlyPrice || Math.round(plan.price * 12 * 0.8);
          return (
            <motion.div 
              key={plan.id} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className={`relative p-8 rounded-3xl border bg-card space-y-8 flex flex-col shadow-sm hover:shadow-xl transition-all duration-300 ${
                plan.popular ? 'ring-2 ring-primary scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${plan.color}`}>
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-extrabold">${price}</span>
                  <span className="text-muted-foreground font-medium">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="space-y-6 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What's Included</p>
                <ul className="space-y-4">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-start gap-3 text-sm font-medium group">
                      <div className="mt-0.5 p-0.5 rounded-full bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                        <CheckCircle2 size={14} />
                      </div>
                      <span className="text-foreground/80 group-hover:text-foreground transition-colors">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link 
                to={user ? `/checkout?plan=${plan.id}&cycle=${billingCycle}` : `/auth?redirect=${encodeURIComponent(`/checkout?plan=${plan.id}&cycle=${billingCycle}`)}`}
                className={`w-full py-4 rounded-2xl font-bold transition-all text-center flex items-center justify-center gap-2 border ${
                  plan.popular
                    ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-lg shadow-primary/20'
                    : 'bg-muted hover:bg-muted/80 border-border'
                }`}
              >
                Get Started
                <Zap size={18} />
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Plan Comparison Table */}
      <div className="space-y-12">
        <div className="text-center space-y-4 relative">
          <h2 className="text-3xl font-bold">Compare <span className="text-primary">Plans</span></h2>
          <p className="text-muted-foreground">A detailed breakdown of what you get with each plan.</p>
          
          {profile?.role === 'admin' && (
            <Link 
              to="/admin?tab=billing" 
              className="absolute -top-4 right-0 flex items-center gap-2 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all"
            >
              <Zap size={14} /> Edit Table
            </Link>
          )}
        </div>

        <div className="overflow-x-auto pb-6">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b">
                <th className="py-6 px-4 text-left font-bold text-lg w-1/4">Features</th>
                <th className="py-6 px-4 text-center font-bold text-lg w-1/4">Free</th>
                <th className="py-6 px-4 text-center font-bold text-lg w-1/4 text-primary">Pro</th>
                <th className="py-6 px-4 text-center font-bold text-lg w-1/4 text-amber-600">Premium</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(settings.comparisonTable || [
                { name: 'Job Posts', free: '1 / month', pro: '5 / month', premium: 'Unlimited' },
                { name: 'Visibility Duration', free: '7 Days', pro: '30 Days', premium: '90 Days' },
                { name: 'Featured Badge', free: false, pro: true, premium: true },
                { name: 'Social Media Promotion', free: false, pro: true, premium: true },
                { name: 'Top of Search', free: false, pro: false, premium: true },
                { name: 'Applicant Tracking', free: false, pro: true, premium: true },
                { name: 'Dedicated Manager', free: false, pro: false, premium: true },
                { name: 'Support Level', free: 'Email', pro: 'Priority', premium: '24/7 Dedicated' },
              ]).map((row: any, i: number) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="py-5 px-4 font-medium">{row.name}</td>
                  <td className="py-5 px-4 text-center text-sm">
                    {typeof row.free === 'boolean' ? (row.free ? <CheckCircle2 className="mx-auto text-emerald-500" size={20} /> : <span className="text-muted-foreground/30">—</span>) : row.free}
                  </td>
                  <td className="py-5 px-4 text-center text-sm font-bold text-primary">
                    {typeof row.pro === 'boolean' ? (row.pro ? <CheckCircle2 className="mx-auto text-emerald-500" size={20} /> : <span className="text-muted-foreground/30">—</span>) : row.pro}
                  </td>
                  <td className="py-5 px-4 text-center text-sm font-bold text-amber-600">
                    {typeof row.premium === 'boolean' ? (row.premium ? <CheckCircle2 className="mx-auto text-emerald-500" size={20} /> : <span className="text-muted-foreground/30">—</span>) : row.premium}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trust Badges & Payments */}
      <div className="p-12 rounded-[2.5rem] border bg-muted/30 space-y-12 text-center max-w-5xl mx-auto">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold flex items-center justify-center gap-3">
            <ShieldCheck className="text-primary" size={28} />
            Secure Payment Gateways
          </h3>
          <p className="text-muted-foreground">
            We use industry-standard encryption to protect your payment information.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
          {settings.paymentGateways.stripe.enabled && (
            <div className="flex items-center gap-2 font-bold text-2xl">
              <CreditCard size={32} className="text-blue-600" /> Stripe
            </div>
          )}
          {settings.paymentGateways.paypal.enabled && (
            <div className="flex items-center gap-2 font-bold text-2xl italic">
              <DollarSign size={32} className="text-blue-800" /> PayPal
            </div>
          )}
          {settings.paymentGateways.razorpay.enabled && (
            <div className="flex items-center gap-2 font-bold text-2xl">
              <Zap size={32} className="text-amber-500" /> Razorpay
            </div>
          )}
          {!settings.paymentGateways.stripe.enabled && !settings.paymentGateways.paypal.enabled && !settings.paymentGateways.razorpay.enabled && (
            <p className="text-muted-foreground italic">Contact us for custom billing options.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto pt-12">
        <div className="space-y-4">
          <h4 className="text-xl font-bold">Frequently Asked Questions</h4>
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-bold">Can I change my plan later?</p>
              <p className="text-sm text-muted-foreground">Yes, you can upgrade or downgrade your plan at any time from your dashboard.</p>
            </div>
            <div className="space-y-2">
              <p className="font-bold">What payment methods do you accept?</p>
              <p className="text-sm text-muted-foreground">We accept all major credit cards via Stripe, as well as PayPal and Razorpay for international payments.</p>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-6 pt-10">
            <div className="space-y-2">
              <p className="font-bold">Is there a long-term commitment?</p>
              <p className="text-sm text-muted-foreground">No, all our plans are month-to-month. You can cancel your subscription at any time without any hidden fees.</p>
            </div>
            <div className="space-y-2">
              <p className="font-bold">Do you offer refunds?</p>
              <p className="text-sm text-muted-foreground">We offer a 7-day money-back guarantee if you're not satisfied with our Pro or Premium services.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
