import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export interface AppSettings {
  siteName: string;
  siteLogo: string;
  siteIcon: string;
  siteDescription: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  seoImage: string;
  contactEmail: string;
  hideContactEmail: boolean;
  hideContactPhone: boolean;
  adsEnabled: boolean;
  maintenanceMode: boolean;
  featuredCountries: string[];
  socialLinks: {
    facebook: string;
    twitter: string;
    instagram: string;
  };
  adsenseConfig: {
    publisherId: string;
    headerSlotId: string;
    sidebarSlotId: string;
    footerSlotId: string;
    jobDetailsSlotId: string;
  };
  headerCode: string;
  adsenseCode: string;
  headerLinks: { label: string; href: string }[];
  footerSections: {
    title: string;
    links: { label: string; href: string }[];
  }[];
  footerCopyright: string;
  contactAddress: string;
  contactPhone: string;
  pricingPlans: {
    [key: string]: {
      id: string;
      name: string;
      price: number;
      description: string;
      features: string[];
      color: string;
      popular?: boolean;
    };
  };
  paymentGateways: {
    testMode: boolean;
    stripe: { enabled: boolean; publicKey: string; secretKey: string };
    paypal: { enabled: boolean; clientId: string; secretKey: string };
    razorpay: { enabled: boolean; keyId: string; keySecret: string };
  };
  comparisonTable: {
    name: string;
    free: string | boolean;
    pro: string | boolean;
    premium: string | boolean;
  }[];
}

const defaultSettings: AppSettings = {
  siteName: '24OnlineJob.com',
  siteLogo: '',
  siteIcon: '',
  siteDescription: 'Find your dream job anywhere in the world.',
  seoTitle: '24OnlineJob - Global Job Search Engine',
  seoDescription: 'Find the best remote, on-site, and hybrid jobs globally.',
  seoKeywords: 'jobs, remote work, career, job search, hiring',
  seoImage: '',
  contactEmail: 'support@24onlinejob.com',
  hideContactEmail: false,
  hideContactPhone: false,
  contactAddress: 'Global HQ, Tech City',
  contactPhone: '+1 (234) 567-890',
  adsEnabled: true,
  maintenanceMode: false,
  featuredCountries: ['gb', 'us', 'ca', 'in', 'au', 'de'],
  socialLinks: {
    facebook: '',
    twitter: '',
    instagram: ''
  },
  adsenseConfig: {
    publisherId: '',
    headerSlotId: '',
    sidebarSlotId: '',
    footerSlotId: '',
    jobDetailsSlotId: ''
  },
  headerCode: '',
  adsenseCode: '',
  headerLinks: [
    { label: 'Find Jobs', href: '/jobs' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Saved Jobs', href: '/saved' }
  ],
  footerSections: [
    {
      title: 'Quick Links',
      links: [
        { label: 'Browse Jobs', href: '/jobs' },
        { label: 'Pricing Plans', href: '/pricing' },
        { label: 'Saved Jobs', href: '/saved' },
        { label: 'Help Center', href: '/help' }
      ]
    },
    {
      title: 'Support',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact Us', href: '/contact' },
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' }
      ]
    },
    {
      title: 'Legal',
      links: [
        { label: 'Disclaimer', href: '/disclaimer' },
        { label: 'Shipping Policy', href: '/shipping-policy' },
        { label: 'Refund Policy', href: '/refund-policy' }
      ]
    }
  ],
  footerCopyright: 'All rights reserved.',
  pricingPlans: {
    free: {
      id: 'free',
      name: 'Free',
      price: 0,
      description: 'Perfect for small businesses starting out.',
      features: [
        '1 Job Post / month',
        '7 Days Visibility',
        'Standard Support',
        'Basic Search Visibility',
        'Company Profile',
        'Email Support'
      ],
      color: 'bg-muted'
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      price: 49,
      description: 'Ideal for growing companies with regular hiring needs.',
      features: [
        '5 Job Posts / month',
        '30 Days Visibility',
        'Priority Support',
        'Featured Badge',
        'Advanced Search Visibility',
        'Social Media Promotion',
        'Email Alerts to Candidates',
        'Applicant Tracking System'
      ],
      color: 'bg-primary/10 text-primary border-primary/20',
      popular: true
    },
    premium: {
      id: 'premium',
      name: 'Premium',
      price: 99,
      description: 'Best for large enterprises and recruitment agencies.',
      features: [
        'Unlimited Job Posts',
        '90 Days Visibility',
        '24/7 Dedicated Support',
        'Featured Badge (Permanent)',
        'Social Media Promotion (All Platforms)',
        'Top of Search Placement',
        'Dedicated Account Manager',
        'Access to Resume Database',
        'Custom Branding & Logo'
      ],
      color: 'bg-amber-500/10 text-amber-600 border-amber-500/20'
    }
  },
  paymentGateways: {
    testMode: true,
    stripe: { enabled: false, publicKey: '', secretKey: '' },
    paypal: { enabled: false, clientId: '', secretKey: '' },
    razorpay: { enabled: false, keyId: '', keySecret: '' }
  },
  comparisonTable: [
    { name: 'Job Posts', free: '1 / month', pro: '5 / month', premium: 'Unlimited' },
    { name: 'Visibility Duration', free: '7 Days', pro: '30 Days', premium: '90 Days' },
    { name: 'Featured Badge', free: false, pro: true, premium: true },
    { name: 'Social Media Promotion', free: false, pro: true, premium: true },
    { name: 'Top of Search', free: false, pro: false, premium: true },
    { name: 'Applicant Tracking', free: false, pro: true, premium: true },
    { name: 'Dedicated Manager', free: false, pro: false, premium: true },
    { name: 'Support Level', free: 'Email', pro: 'Priority', premium: '24/7 Dedicated' },
  ]
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setSettings(prev => ({ ...prev, ...doc.data() }));
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching settings:', error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return { settings, loading };
}
