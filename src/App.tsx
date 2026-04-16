import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdSlot from './components/AdSlot';
import Home from './pages/Home';
import Jobs from './pages/Jobs';
import JobDetails from './pages/JobDetails';
import Auth from './pages/Auth';
import SavedJobs from './pages/SavedJobs';
import Admin from './pages/Admin';
import UserDashboard from './pages/UserDashboard';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import Pricing from './pages/Pricing';
import DynamicPage from './pages/DynamicPage';
import Checkout from './pages/Checkout';
import VerifyEmail from './pages/VerifyEmail';
import GettingStarted from './pages/GettingStarted';
import AccountSecurity from './pages/AccountSecurity';
import AboutUs from './pages/AboutUs';
import ContactUs from './pages/ContactUs';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import HelpCenter from './pages/HelpCenter';
import SEO from './components/SEO';
import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';
import { Loader2, Hammer } from 'lucide-react';

export default function App() {
  const { user, loading: authLoading, profile } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();

  useEffect(() => {
    // Inject Header Code (Analytics, Search Console)
    if (!settingsLoading && settings.headerCode) {
      const div = document.createElement('div');
      div.innerHTML = settings.headerCode;
      const fragments = document.createDocumentFragment();
      while (div.firstChild) {
        fragments.appendChild(div.firstChild);
      }
      document.head.appendChild(fragments);
    }

    // Inject AdSense Code/Script
    if (!settingsLoading && settings.adsEnabled && settings.adsenseCode) {
      const div = document.createElement('div');
      div.innerHTML = settings.adsenseCode;
      const fragments = document.createDocumentFragment();
      while (div.firstChild) {
        fragments.appendChild(div.firstChild);
      }
      document.head.appendChild(fragments);
    }

    if (!settingsLoading && settings.adsEnabled && settings.adsenseConfig.publisherId && (!profile || profile.subscriptionStatus === 'free')) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${settings.adsenseConfig.publisherId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [settingsLoading, settings.adsEnabled, settings.adsenseConfig.publisherId, settings.headerCode, settings.adsenseCode, profile]);

  if (authLoading || settingsLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Maintenance Mode Check (Admins can still see the site)
  if (settings.maintenanceMode && profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-center p-6 space-y-6">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary">
          <Hammer size={48} />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="text-4xl font-bold">{settings.siteName} is Under Maintenance</h1>
          <p className="text-muted-foreground">We're currently performing some scheduled updates. We'll be back online shortly. Thank you for your patience!</p>
        </div>
        <div className="pt-8 border-t w-full max-w-xs">
          <p className="text-sm font-medium">Contact Support</p>
          <p className="text-primary">{settings.contactEmail}</p>
        </div>
      </div>
    );
  }

  // Protected Route Wrapper with Email Verification Check
  const ProtectedRoute = ({ children, requireVerification = true }: { children: React.ReactNode, requireVerification?: boolean }) => {
    if (!user) return <Navigate to="/auth" />;
    if (requireVerification && !user.emailVerified) return <Navigate to="/verify-email" />;
    return <>{children}</>;
  };

  return (
    <HelmetProvider>
      <Router>
        <SEO />
        <div className="flex min-h-screen flex-col bg-background text-foreground">
          <Navbar />
          <AdSlot slot="header" className="container mx-auto px-4" />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetails />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/saved" element={<ProtectedRoute><SavedJobs /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/help/getting-started" element={<GettingStarted />} />
              <Route path="/help/account-security" element={<AccountSecurity />} />
              <Route path="/privacy" element={<DynamicPage pageId="privacy" />} />
              <Route path="/terms" element={<DynamicPage pageId="terms" />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="/about" element={<DynamicPage pageId="about" />} />
              <Route path="/shipping-policy" element={<DynamicPage pageId="shipping" />} />
              <Route path="/refund-policy" element={<DynamicPage pageId="refund" />} />
              <Route path="/disclaimer" element={<DynamicPage pageId="disclaimer" />} />
              <Route path="/faq" element={<DynamicPage pageId="faq" />} />
            </Routes>
          </main>
          <AdSlot slot="footer" className="container mx-auto px-4" />
          <Footer />
        </div>
      </Router>
    </HelmetProvider>
  );
}

