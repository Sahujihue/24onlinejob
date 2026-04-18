import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { useSearchParams } from 'react-router-dom';
import { 
  collection, query, getDocs, doc, getDoc, updateDoc, setDoc,
  addDoc, deleteDoc, serverTimestamp, orderBy, limit 
} from 'firebase/firestore';
import { 
  Users, Search, BarChart3, Settings, ShieldAlert, 
  CheckCircle2, XCircle, Trash2, Edit, Plus, ExternalLink,
  Loader2, Lock, Globe, DollarSign, Briefcase, Save, X,
  CreditCard, Image as ImageIcon, Layout, AlertCircle, Zap, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Job } from '../types';
import ReactQuill from 'react-quill-new';
import { DEFAULT_PAGES } from '../constants/defaultPages';

export default function Admin() {
  const { user, profile, loading: authLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSearches: 0,
    apiUsage: 0,
    activeJobs: 0
  });
  const [settings, setSettings] = useState({
    siteName: '24OnlineJob.com',
    siteLogo: '',
    siteIcon: '',
    siteDescription: 'Find your dream job anywhere in the world.',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    seoImage: '',
    contactEmail: 'support@24onlinejob.com',
    hideContactEmail: false,
    hideContactPhone: false,
    adsEnabled: true,
    maintenanceMode: false,
    featuredCountries: ['gb', 'us', 'ca', 'in', 'au', 'de'],
    socialLinks: {
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: ''
    },
    adsenseConfig: {
      publisherId: '',
      headerSlotId: '',
      sidebarSlotId: '',
      footerSlotId: '',
      jobDetailsSlotId: ''
    },
    pricingPlans: {
      free: { 
        id: 'free', 
        name: 'Free', 
        price: 0, 
        yearlyPrice: 0, 
        description: 'Perfect for exploring opportunities', 
        features: ['Search global job listings', 'Save up to 5 jobs', 'Basic job alerts', 'Community support'], 
        color: 'bg-muted' 
      },
      pro: { 
        id: 'pro', 
        name: 'Pro', 
        price: 49, 
        yearlyPrice: 470, 
        description: 'For serious job seekers', 
        features: ['Unlimited job searches', 'Unlimited saved jobs', 'Priority job alerts', 'Featured profile badge', 'Direct employer messaging'], 
        color: 'bg-primary/10 text-primary border-primary/20', 
        popular: true 
      },
      premium: { 
        id: 'premium', 
        name: 'Premium', 
        price: 99, 
        yearlyPrice: 950, 
        description: 'Ultimate career growth tools', 
        features: ['All Pro features', 'Resume builder access', 'AI-powered cover letters', '1-on-1 career coaching', 'Verified professional badge'], 
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
    ],
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
          { label: 'Saved Jobs', href: '/saved' }
        ]
      },
      {
        title: 'Support',
        links: [
          { label: 'About Us', href: '/about' },
          { label: 'Contact Us', href: '/contact' },
          { label: 'Help Center', href: '/help' },
          { label: 'Privacy Policy', href: '/privacy' },
          { label: 'Terms of Service', href: '/terms' }
        ]
      }
    ],
    footerCopyright: 'All rights reserved.',
    contactAddress: 'Global HQ, Tech City',
    contactPhone: '+1 (234) 567-890'
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'users' | 'settings' | 'billing' | 'pages' | 'transactions' | 'navigation' | 'api' | 'help'>(
    (searchParams.get('tab') as any) || 'overview'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab]);

  const [jobFilter, setJobFilter] = useState<'all' | 'active' | 'spam'>('all');
  const [userSearch, setUserSearch] = useState('');
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [testingApi, setTestingApi] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [apiConfig, setApiConfig] = useState<any>({
    adzuna: { enabled: true, appId: '', appKey: '' },
    jsearch: { enabled: true, apiKey: '', host: 'jsearch.p.rapidapi.com' },
    google: { enabled: true, apiKey: '', host: 'google-jobs-api.p.rapidapi.com' }
  });
  const [isResettingPages, setIsResettingPages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  
  // Job Management State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchApiStatus = async () => {
      try {
        const response = await fetch('/api/admin/status');
        const data = await response.json();
        setApiStatus(data);
      } catch (error) {
        console.error('Error fetching API status:', error);
      }
    };
    if (activeTab === 'api') {
      fetchApiStatus();
    }
  }, [activeTab]);

  const updateApiConfig = async (newConfig: any) => {
    setIsSaving(true);
    setSaveSuccess(null);
    setApiConfig(newConfig);
    try {
      await setDoc(doc(db, 'settings', 'api'), newConfig, { merge: true });
      setSaveSuccess('API configuration saved successfully!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating API config:', error);
      alert('Failed to save API config. Please check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const openPageEditor = (page: any) => {
    setEditingPage(page);
    setIsHtmlMode(false);
  };

  const resetSinglePage = async () => {
    if (!editingPage) return;
    
    const defaultPage = DEFAULT_PAGES.find(p => p.id === editingPage.id);
    if (defaultPage) {
      setEditingPage({ ...editingPage, content: defaultPage.content });
    }
  };

  const resetPages = async () => {
    setIsResettingPages(true);
    try {
      const finalPages = [];
      for (const page of DEFAULT_PAGES) {
        const pageData = {
          ...page,
          updatedAt: serverTimestamp()
        };
        await setDoc(doc(db, 'pages', page.id), pageData);
        finalPages.push(pageData);
      }
      setPages(finalPages);

      // Update footer links in global settings
      const newFooterSections = [
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
      ];

      await updateDoc(doc(db, 'settings', 'global'), {
        footerSections: newFooterSections
      });
      
      setSettings(prev => ({ ...prev, footerSections: newFooterSections }));
      
      // Refresh pages list
      const pagesSnap = await getDocs(collection(db, 'pages'));
      setPages(pagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      alert('All pages and footer links have been reset to default successfully!');
    } catch (error) {
      console.error('Error resetting pages:', error);
      alert('Failed to reset pages. Please check console for details.');
    } finally {
      setIsResettingPages(false);
    }
  };

  const testApi = async (api: string) => {
    setTestingApi(api);
    setTestResult(null);
    try {
      let endpoint = '';
      if (api === 'adzuna') endpoint = '/api/jobs/adzuna?country=gb&what=developer';
      if (api === 'jsearch') endpoint = '/api/jobs/jsearch?query=developer%20jobs%20in%20chicago&page=1&country=us&date_posted=all';
      if (api === 'google') endpoint = '/api/jobs/google?query=senior engineer';

      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (response.ok) {
        const isMock = (api === 'jsearch' || api === 'google' || api === 'adzuna') && data.request_id === 'mock-request';
        setTestResult({ 
          success: true, 
          count: data.results?.length || data.data?.length || data.hits?.length || 0,
          isMock
        });
      } else {
        setTestResult({ success: false, error: data.error, details: data.details });
      }
    } catch (error: any) {
      setTestResult({ success: false, error: 'Network error', details: error.message });
    } finally {
      setTestingApi(null);
    }
  };
  
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image', 'video'],
      ['clean'],
      [{ 'align': [] }],
      ['blockquote', 'code-block'],
    ],
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'color', 'background',
    'link', 'image', 'video', 'align', 'blockquote', 'code-block'
  ];
  
  const [jobForm, setJobForm] = useState<Partial<Job>>({
    title: '',
    company: '',
    location: '',
    country: 'gb',
    salary: '',
    applyUrl: '',
    description: '',
    jobType: 'On-site',
    isFeatured: false,
    isSpam: false,
    imageUrl: ''
  });

  useEffect(() => {
    if (authLoading) return;
    if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
      setLoading(false);
      return;
    }

    const loadAdminData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel for better performance
        const [
          usersSnap,
          jobsSnap,
          pagesSnap,
          transSnap,
          settingsDoc,
          apiConfigDoc
        ] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'jobs')),
          getDocs(collection(db, 'pages')),
          getDocs(query(collection(db, 'transactions'), orderBy('createdAt', 'desc'))),
          getDoc(doc(db, 'settings', 'global')),
          getDoc(doc(db, 'settings', 'api'))
        ]);
        
        setStats({
          totalUsers: usersSnap.size,
          totalSearches: 45200, // Mocked for now
          apiUsage: 85,
          activeJobs: jobsSnap.size + 15000 // Mocked external + real
        });
        
        // Process Jobs
        const jobsList = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job));
        setJobs(jobsList);

        // Process Users
        const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsersList(usersList);

        // Process Pages
        const pagesList = pagesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Process Transactions
        setTransactions(transSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        // Initialize default pages if they don't exist
        const finalPages = [...pagesList];
        const missingPages = DEFAULT_PAGES.filter(defPage => !pagesList.find(p => p.id === defPage.id));
        
        if (missingPages.length > 0) {
          await Promise.all(missingPages.map(async (defPage) => {
            const pageRef = doc(db, 'pages', defPage.id);
            const newPage = { ...defPage, updatedAt: serverTimestamp() };
            await setDoc(pageRef, newPage);
            finalPages.push(newPage);
          }));
        }
        setPages(finalPages);

        // Process Settings
        if (settingsDoc.exists()) {
          setSettings(prev => ({ ...prev, ...settingsDoc.data() }));
        }

        // Process API Config
        if (apiConfigDoc.exists()) {
          setApiConfig(prev => ({ ...prev, ...apiConfigDoc.data() }));
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, [user, profile, authLoading]);

  const [isResettingFooter, setIsResettingFooter] = useState(false);

  const resetFooterLinks = async () => {
    if (!window.confirm('Are you sure you want to reset all footer links to default? This will overwrite your current footer configuration.')) return;
    
    setIsResettingFooter(true);
    try {
      const newFooterSections = [
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
      ];

      await updateDoc(doc(db, 'settings', 'global'), {
        footerSections: newFooterSections
      });
      
      setSettings(prev => ({ ...prev, footerSections: newFooterSections }));
      alert('Footer links have been reset to default successfully!');
    } catch (error) {
      console.error('Error resetting footer links:', error);
      alert('Failed to reset footer links.');
    } finally {
      setIsResettingFooter(false);
    }
  };

  const updateGlobalSettings = async (newSettings: any) => {
    setIsSaving(true);
    setSaveSuccess(null);
    setSettings(newSettings);
    try {
      await setDoc(doc(db, 'settings', 'global'), newSettings, { merge: true });
      setSaveSuccess('Global settings saved successfully!');
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (error) {
      console.error('Error updating global settings:', error);
      alert('Failed to save settings. Please check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingsImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert("Image size too large! Please use an image under 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleAds = () => {
    updateGlobalSettings({ ...settings, adsEnabled: !settings.adsEnabled });
  };

  const toggleMaintenance = () => {
    updateGlobalSettings({ ...settings, maintenanceMode: !settings.maintenanceMode });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setJobForm({ ...jobForm, imageUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveJob = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (editingJob) {
        await updateDoc(doc(db, 'jobs', editingJob.id), {
          ...jobForm,
          updatedAt: serverTimestamp()
        });
        setJobs(jobs.map(j => j.id === editingJob.id ? { ...j, ...jobForm } as Job : j));
      } else {
        const docRef = await addDoc(collection(db, 'jobs'), {
          ...jobForm,
          createdAt: serverTimestamp(),
          source: 'Manual'
        });
        setJobs([{ id: docRef.id, ...jobForm, source: 'Manual' } as Job, ...jobs]);
      }
      setIsAddingJob(false);
      setEditingJob(null);
      setImagePreview(null);
      setJobForm({
        title: '',
        company: '',
        location: '',
        country: 'gb',
        salary: '',
        applyUrl: '',
        description: '',
        jobType: 'On-site',
        isFeatured: false,
        imageUrl: ''
      });
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const handleDeleteJob = async (id: string) => {
    // window.confirm can be problematic in iframes, using a simpler approach
    // In a real app, we'd use a custom modal
    try {
      await deleteDoc(doc(db, 'jobs', id));
      setJobs(jobs.filter(j => j.id !== id));
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const handleSavePage = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;
    
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      await updateDoc(doc(db, 'pages', editingPage.id), {
        title: editingPage.title,
        content: editingPage.content,
        updatedAt: serverTimestamp()
      });
      setPages(pages.map(p => p.id === editingPage.id ? editingPage : p));
      setSaveSuccess('Page saved successfully!');
      setTimeout(() => {
        setEditingPage(null);
        setIsHtmlMode(false);
        setSaveSuccess(null);
      }, 1500);
    } catch (error) {
      console.error('Error saving page:', error);
      alert('Failed to save page. Please check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || (loading && activeTab === 'overview')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse">Loading Admin Panel...</p>
        </div>
      </div>
    );
  }

  if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto text-destructive">
          <Lock size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Access Denied</h1>
          <p className="text-muted-foreground">
            {profile ? "You do not have administrative privileges to view this page." : "We couldn't verify your administrative status. This might be due to a connection issue with the database."}
          </p>
        </div>
        <div className="flex flex-col items-center gap-4">
          <button onClick={() => window.history.back()} className="text-primary hover:underline">Go Back</button>
          <button onClick={() => window.location.reload()} className="text-sm text-muted-foreground hover:text-foreground">Try Refreshing</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldAlert className="text-primary" />
            Admin Control Center
          </h1>
          <p className="text-muted-foreground">Full control over 24OnlineJob.com platform.</p>
        </div>
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border overflow-x-auto">
          {(['overview', 'jobs', 'users', 'pages', 'navigation', 'settings', 'billing', 'transactions', 'api', 'help'] as const)
            .filter(tab => {
              if (profile?.role === 'admin') return true;
              return ['overview', 'jobs', 'help'].includes(tab);
            })
            .map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-background shadow-sm text-primary border border-border' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl border bg-card space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:w-32 group-hover:h-32"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                  <Users size={24} />
                </div>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">+12%</span>
              </div>
              <div className="relative z-10">
                <p className="text-sm text-muted-foreground font-medium">Total Users</p>
                <p className="text-3xl font-bold tracking-tight">{stats.totalUsers.toLocaleString()}</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl border bg-card space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:w-32 group-hover:h-32"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
                  <Search size={24} />
                </div>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">+24%</span>
              </div>
              <div className="relative z-10">
                <p className="text-sm text-muted-foreground font-medium">Total Searches</p>
                <p className="text-3xl font-bold tracking-tight">{stats.totalSearches.toLocaleString()}</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl border bg-card space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:w-32 group-hover:h-32"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                  <BarChart3 size={24} />
                </div>
                <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">Normal</span>
              </div>
              <div className="relative z-10">
                <p className="text-sm text-muted-foreground font-medium">API Usage</p>
                <p className="text-3xl font-bold tracking-tight">{stats.apiUsage}%</p>
              </div>
            </div>
            <div className="p-6 rounded-2xl border bg-card space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:w-32 group-hover:h-32"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                  <CheckCircle2 size={24} />
                </div>
                <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">Live</span>
              </div>
              <div className="relative z-10">
                <p className="text-sm text-muted-foreground font-medium">Active Jobs</p>
                <p className="text-3xl font-bold tracking-tight">{stats.activeJobs.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-8 rounded-2xl border bg-card space-y-6">
              <h2 className="text-xl font-bold">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setActiveTab('jobs')} className="p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all text-left space-y-2">
                  <Plus className="text-primary" />
                  <p className="font-bold">Post Job</p>
                  <p className="text-xs text-muted-foreground">Manually add a featured job</p>
                </button>
                <button onClick={() => setActiveTab('settings')} className="p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all text-left space-y-2">
                  <Settings className="text-primary" />
                  <p className="font-bold">Settings</p>
                  <p className="text-xs text-muted-foreground">Configure global platform</p>
                </button>
              </div>
            </div>
            <div className="p-8 rounded-2xl border bg-card space-y-6">
              <h2 className="text-xl font-bold">Platform Health</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Database Connection</span>
                  <span className="text-emerald-500 font-bold">Healthy</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Authentication Service</span>
                  <span className="text-emerald-500 font-bold">Healthy</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Job Aggregator APIs</span>
                  <span className="text-emerald-500 font-bold">Healthy</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">Manage Manual Jobs</h2>
              <div className="flex items-center bg-muted rounded-lg p-1">
                <button 
                  onClick={() => setJobFilter('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jobFilter === 'all' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                  All
                </button>
                <button 
                  onClick={() => setJobFilter('active')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jobFilter === 'active' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                  Active
                </button>
                <button 
                  onClick={() => setJobFilter('spam')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jobFilter === 'spam' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
                >
                  Spam
                </button>
              </div>
            </div>
            <button 
              onClick={() => setIsAddingJob(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              Add New Job
            </button>
          </div>

          <div className="bg-card rounded-2xl border overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">Job Title</th>
                  <th className="px-6 py-4 font-semibold">Company</th>
                  <th className="px-6 py-4 font-semibold">Location</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs
                  .filter(job => {
                    if (jobFilter === 'active') return !job.isSpam;
                    if (jobFilter === 'spam') return job.isSpam;
                    return true;
                  })
                  .map((job) => (
                  <tr key={job.id} className={`hover:bg-muted/30 transition-colors ${job.isSpam ? 'opacity-50 bg-destructive/5' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="font-medium">{job.title}</div>
                      <div className="text-[10px] text-muted-foreground font-mono">{job.id}</div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{job.company}</td>
                    <td className="px-6 py-4 text-muted-foreground">{job.location}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {job.isFeatured && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase">
                            Featured
                          </span>
                        )}
                        {job.isSpam && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full uppercase">
                            Spam
                          </span>
                        )}
                        {!job.isFeatured && !job.isSpam && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingJob(job);
                            setJobForm(job);
                            setImagePreview(job.imageUrl || null);
                            setIsAddingJob(true);
                          }}
                          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-colors"
                          title="Edit Job"
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'jobs', job.id), { isSpam: !job.isSpam });
                              setJobs(jobs.map(j => j.id === job.id ? { ...j, isSpam: !j.isSpam } : j));
                            } catch (error) {
                              console.error('Error toggling spam:', error);
                            }
                          }}
                          className={`p-2 rounded-lg transition-colors ${job.isSpam ? 'bg-destructive text-destructive-foreground' : 'hover:bg-destructive/10 text-destructive'}`}
                          title={job.isSpam ? 'Unmark as Spam' : 'Mark as Spam'}
                        >
                          <ShieldAlert size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                          title="Delete Job"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      No manual jobs found. Click "Add New Job" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Manage Platform Users</h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input 
                  type="text" 
                  placeholder="Search by name or email..."
                  className="pl-10 pr-4 py-2 rounded-lg border bg-background text-sm w-full md:w-64"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                <Users size={16} />
                <span>{usersList.length} Total Users</span>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-2xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">User</th>
                    <th className="px-6 py-4 font-semibold">Email</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Subscription</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {usersList
                    .filter(u => 
                      u.email?.toLowerCase().includes(userSearch.toLowerCase()) || 
                      u.displayName?.toLowerCase().includes(userSearch.toLowerCase())
                    )
                    .map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                              {(u.displayName || u.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium">{u.displayName || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{u.email}</td>
                        <td className="px-6 py-4">
                          <select 
                            value={u.role || 'user'}
                            disabled={profile?.role !== 'admin' && profile?.role !== 'moderator'}
                            onChange={async (e) => {
                              const newRole = e.target.value;
                              try {
                                await updateDoc(doc(db, 'users', u.id), { role: newRole });
                                setUsersList(usersList.map(user => user.id === u.id ? { ...user, role: newRole } : user));
                              } catch (error) {
                                console.error('Error updating user role:', error);
                                alert('Error updating user role. Please try again.');
                              }
                            }}
                            className="bg-background border rounded px-2 py-1 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer hover:bg-muted/50 transition-colors"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                            u.subscriptionStatus === 'premium' ? 'bg-amber-100 text-amber-600' :
                            u.subscriptionStatus === 'pro' ? 'bg-blue-100 text-blue-600' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {u.subscriptionStatus || 'Free'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => setUserToDelete(u.id)}
                            disabled={profile?.role !== 'admin' && profile?.role !== 'moderator'}
                            className={`transition-colors ${profile?.role === 'admin' || profile?.role === 'moderator' ? 'text-destructive hover:text-destructive/80' : 'text-muted-foreground cursor-not-allowed opacity-50'}`}
                            title={profile?.role === 'admin' || profile?.role === 'moderator' ? "Delete User" : "Only admins can delete users"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pages' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold">Static Pages</h2>
              <p className="text-muted-foreground">Edit the content of your website's static pages.</p>
            </div>
            <button 
              onClick={resetPages}
              disabled={isResettingPages}
              className="px-4 py-2 border border-destructive text-destructive rounded-lg text-sm font-bold hover:bg-destructive/5 transition-all flex items-center gap-2"
            >
              {isResettingPages ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
              Reset All to Default
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pages.map(page => (
              <div key={page.id} className="p-6 rounded-2xl border bg-card space-y-4 group hover:border-primary transition-all">
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Globe size={24} />
                  </div>
                  <button 
                    onClick={() => openPageEditor(page)}
                    className="p-2 hover:bg-accent rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Edit size={18} />
                  </button>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{page.title}</h3>
                  <p className="text-xs text-muted-foreground">Last updated: {page.updatedAt?.seconds ? new Date(page.updatedAt.seconds * 1000).toLocaleDateString() : 'Never'}</p>
                </div>
                <div className="pt-4 border-t">
                  <button 
                    onClick={() => openPageEditor(page)}
                    className="w-full py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-bold transition-all"
                  >
                    Edit Content
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'navigation' && (
        <div className="max-w-4xl space-y-8 pb-20">
          <div className="p-8 rounded-2xl border bg-card space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Layout className="text-primary" />
                Header & Footer Management
              </h2>
              <div className="flex items-center gap-4">
                {saveSuccess === 'Global settings saved successfully!' && (
                  <span className="text-sm font-bold text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
                    <CheckCircle2 size={16} /> Saved!
                  </span>
                )}
                <button 
                  onClick={() => updateGlobalSettings(settings)}
                  disabled={isSaving}
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Header Links */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Header Navigation Links</h3>
                <button 
                  onClick={() => setSettings({
                    ...settings,
                    headerLinks: [...settings.headerLinks, { label: 'New Link', href: '#' }]
                  })}
                  className="text-sm text-primary flex items-center gap-1 hover:underline"
                >
                  <Plus size={16} /> Add Link
                </button>
              </div>
              <div className="space-y-3">
                {settings.headerLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                    <input 
                      type="text"
                      className="flex-1 px-3 py-1.5 rounded border bg-background text-sm"
                      placeholder="Label"
                      value={link.label}
                      onChange={e => {
                        const newLinks = [...settings.headerLinks];
                        newLinks[idx].label = e.target.value;
                        setSettings({ ...settings, headerLinks: newLinks });
                      }}
                    />
                    <input 
                      type="text"
                      className="flex-1 px-3 py-1.5 rounded border bg-background text-sm"
                      placeholder="URL (e.g. /jobs)"
                      value={link.href}
                      onChange={e => {
                        const newLinks = [...settings.headerLinks];
                        newLinks[idx].href = e.target.value;
                        setSettings({ ...settings, headerLinks: newLinks });
                      }}
                    />
                    <button 
                      onClick={() => {
                        const newLinks = settings.headerLinks.filter((_, i) => i !== idx);
                        setSettings({ ...settings, headerLinks: newLinks });
                      }}
                      className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Sections */}
            <div className="space-y-6 pt-8 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Footer Link Sections</h3>
                <button 
                  onClick={() => setSettings({
                    ...settings,
                    footerSections: [...settings.footerSections, { title: 'New Section', links: [] }]
                  })}
                  className="text-sm text-primary flex items-center gap-1 hover:underline"
                >
                  <Plus size={16} /> Add Section
                </button>
              </div>
              
              <div className="space-y-8">
                {settings.footerSections.map((section, sIdx) => (
                  <div key={sIdx} className="p-6 rounded-xl border bg-muted/10 space-y-4">
                    <div className="flex items-center gap-4">
                      <input 
                        type="text"
                        className="flex-1 px-3 py-2 rounded-lg border bg-background font-bold"
                        placeholder="Section Title"
                        value={section.title}
                        onChange={e => {
                          const newSections = [...settings.footerSections];
                          newSections[sIdx].title = e.target.value;
                          setSettings({ ...settings, footerSections: newSections });
                        }}
                      />
                      <button 
                        onClick={() => {
                          const newSections = settings.footerSections.filter((_, i) => i !== sIdx);
                          setSettings({ ...settings, footerSections: newSections });
                        }}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                      {section.links.map((link, lIdx) => (
                        <div key={lIdx} className="flex items-center gap-3">
                          <input 
                            type="text"
                            className="flex-1 px-3 py-1.5 rounded border bg-background text-sm"
                            placeholder="Label"
                            value={link.label}
                            onChange={e => {
                              const newSections = [...settings.footerSections];
                              newSections[sIdx].links[lIdx].label = e.target.value;
                              setSettings({ ...settings, footerSections: newSections });
                            }}
                          />
                          <input 
                            type="text"
                            className="flex-1 px-3 py-1.5 rounded border bg-background text-sm"
                            placeholder="URL"
                            value={link.href}
                            onChange={e => {
                              const newSections = [...settings.footerSections];
                              newSections[sIdx].links[lIdx].href = e.target.value;
                              setSettings({ ...settings, footerSections: newSections });
                            }}
                          />
                          <button 
                            onClick={() => {
                              const newSections = [...settings.footerSections];
                              newSections[sIdx].links = newSections[sIdx].links.filter((_, i) => i !== lIdx);
                              setSettings({ ...settings, footerSections: newSections });
                            }}
                            className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => {
                          const newSections = [...settings.footerSections];
                          newSections[sIdx].links.push({ label: 'New Link', href: '#' });
                          setSettings({ ...settings, footerSections: newSections });
                        }}
                        className="text-xs text-primary flex items-center gap-1 hover:underline pt-2"
                      >
                        <Plus size={14} /> Add Link to {section.title}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Bottom */}
            <div className="space-y-4 pt-8 border-t">
              <h3 className="text-lg font-bold">Footer Bottom Settings</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Copyright Text</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border bg-background"
                    value={settings.footerCopyright}
                    onChange={e => setSettings({...settings, footerCopyright: e.target.value})}
                    placeholder="e.g. All rights reserved."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Address</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={settings.contactAddress}
                      onChange={e => setSettings({...settings, contactAddress: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Phone</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="text"
                        className="flex-1 px-4 py-2 rounded-lg border bg-background"
                        value={settings.contactPhone}
                        onChange={e => setSettings({...settings, contactPhone: e.target.value})}
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={settings.hideContactPhone}
                          onChange={e => setSettings({...settings, hideContactPhone: e.target.checked})}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-medium text-muted-foreground">Hide in Footer</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Email</label>
                    <div className="flex items-center gap-4">
                      <input 
                        type="email"
                        className="flex-1 px-4 py-2 rounded-lg border bg-background"
                        value={settings.contactEmail}
                        onChange={e => setSettings({...settings, contactEmail: e.target.value})}
                      />
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={settings.hideContactEmail}
                          onChange={e => setSettings({...settings, hideContactEmail: e.target.checked})}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-medium text-muted-foreground">Hide in Footer</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'api' && (
        <div className="max-w-4xl space-y-8 pb-20">
          <div className="p-8 rounded-2xl border bg-card space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Globe className="text-primary" />
                  API Configuration & Status
                </h2>
                <p className="text-muted-foreground">Monitor and test your external job board API connections.</p>
              </div>
              <button 
                onClick={() => {
                  setApiStatus(null);
                  const fetchApiStatus = async () => {
                    try {
                      const response = await fetch('/api/admin/status');
                      const data = await response.json();
                      setApiStatus(data);
                    } catch (error) {
                      console.error('Error fetching API status:', error);
                    }
                  };
                  fetchApiStatus();
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                title="Refresh Status"
              >
                <Zap size={20} className={!apiStatus ? 'animate-pulse text-primary' : 'text-muted-foreground'} />
              </button>
            </div>

            {!apiStatus ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-primary" size={32} />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Adzuna */}
                <div className="p-6 rounded-2xl border bg-background space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Adzuna API</h3>
                    <div className={`w-3 h-3 rounded-full ${apiStatus?.adzuna?.configured ? 'bg-emerald-500' : 'bg-destructive'}`}></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</p>
                    <p className="text-xs font-medium">{apiStatus?.adzuna?.configured ? 'Configured' : 'Missing'}</p>
                  </div>
                  <button 
                    onClick={() => testApi('adzuna')}
                    disabled={!!testingApi}
                    className="w-full py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    {testingApi === 'adzuna' ? <Loader2 size={14} className="animate-spin" /> : 'Test Connection'}
                  </button>
                </div>

                {/* JSearch */}
                <div className="p-6 rounded-2xl border bg-background space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">JSearch (RapidAPI)</h3>
                    <div className={`w-3 h-3 rounded-full ${apiStatus?.jsearch?.configured ? 'bg-emerald-500' : 'bg-destructive'}`}></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Key</p>
                    <p className="text-xs font-mono opacity-60">{apiStatus?.jsearch?.maskedKey || 'None'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Host</p>
                    <p className="text-xs font-medium truncate" title={apiStatus?.jsearch?.host}>{apiStatus?.jsearch?.host || 'N/A'}</p>
                  </div>
                  <button 
                    onClick={() => testApi('jsearch')}
                    disabled={!!testingApi}
                    className="w-full py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    {testingApi === 'jsearch' ? <Loader2 size={14} className="animate-spin" /> : 'Test Connection'}
                  </button>
                </div>

                {/* Google Jobs */}
                <div className="p-6 rounded-2xl border bg-background space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">Google Jobs</h3>
                    <div className={`w-3 h-3 rounded-full ${apiStatus?.google?.configured ? 'bg-emerald-500' : 'bg-destructive'}`}></div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Key</p>
                    <p className="text-xs font-mono opacity-60">{apiStatus?.google?.maskedKey || 'None'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Host</p>
                    <p className="text-xs font-medium truncate" title={apiStatus?.google?.host}>{apiStatus?.google?.host || 'N/A'}</p>
                  </div>
                  <button 
                    onClick={() => testApi('google')}
                    disabled={!!testingApi}
                    className="w-full py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    {testingApi === 'google' ? <Loader2 size={14} className="animate-spin" /> : 'Test Connection'}
                  </button>
                </div>
              </div>
            )}

            {testResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 rounded-2xl border ${testResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-destructive/5 border-destructive/20'}`}
              >
                <div className="flex items-start gap-4">
                  {testResult.success ? (
                    <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
                  ) : (
                    <AlertCircle className="text-destructive shrink-0" size={24} />
                  )}
                  <div className="space-y-1 w-full">
                    <h4 className={`font-bold ${testResult.success ? 'text-emerald-700' : 'text-destructive'}`}>
                      {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                    </h4>
                    {testResult.success ? (
                      <div className="space-y-2">
                        <p className="text-sm text-emerald-600">Successfully retrieved {testResult.count} jobs from the API.</p>
                        {testResult.isMock && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                            <p className="text-xs font-bold text-amber-700 flex items-center gap-2">
                              <AlertCircle size={14} />
                              Fallback Mode Active
                            </p>
                            <p className="text-[10px] text-amber-600 leading-tight">
                              The API returned a <strong>429 Rate Limit</strong> error. We are currently showing <strong>Mock Data</strong> so you can continue testing the UI. Please upgrade your RapidAPI plan or wait for your quota to reset.
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-sm text-destructive/80 font-bold">{testResult.error}</p>
                        {testResult.details && (
                          <div className="text-xs text-destructive/60 leading-relaxed bg-white/50 p-3 rounded-lg border border-destructive/10 font-mono break-all overflow-auto max-h-40">
                            {typeof testResult.details === 'object' ? JSON.stringify(testResult.details, null, 2) : testResult.details}
                          </div>
                        )}
                        <div className="p-4 bg-background/50 rounded-xl border space-y-2">
                          <p className="text-xs font-bold flex items-center gap-2 text-foreground">
                            <Zap size={14} className="text-primary" /> 
                            Troubleshooting Steps:
                          </p>
                          <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
                            <li><strong>Error 403:</strong> Your RapidAPI Key is invalid or you are not subscribed to this specific API. Visit RapidAPI and click "Subscribe to Test".</li>
                            <li><strong>Error 429:</strong> Rate limit reached. RapidAPI free tiers are often limited to 5-10 requests per month.</li>
                            <li><strong>Host Mismatch:</strong> Ensure the "API Host" field matches exactly what is shown on the RapidAPI endpoints page.</li>
                            <li><strong>Key Missing:</strong> Ensure you have clicked "Save API Settings" after entering your key.</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="p-6 rounded-2xl border bg-muted/20 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <ShieldAlert size={18} className="text-amber-500" />
                How to configure APIs
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-2">
                  <p className="font-semibold">1. RapidAPI Setup</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Go to <a href="https://rapidapi.com" target="_blank" className="text-primary hover:underline">RapidAPI.com</a></li>
                    <li>Subscribe to <strong>JSearch</strong>, <strong>Indeed12</strong>, <strong>Google Jobs</strong>, and <strong>Realtime Jobs Search</strong></li>
                    <li>Copy your <strong>X-RapidAPI-Key</strong></li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <p className="font-semibold">2. Environment Variables</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>Open the <strong>Secrets</strong> panel in AI Studio</li>
                    <li>Set <code>RAPIDAPI_KEY</code> to your key</li>
                    <li>(Optional) Set <code>INDEED_RAPIDAPI_HOST</code> if using a different Indeed API</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold">API Configuration</h3>
                <div className="flex items-center gap-4">
                  {saveSuccess === 'API configuration saved successfully!' && (
                    <span className="text-sm font-bold text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
                      <CheckCircle2 size={16} /> API Settings Saved!
                    </span>
                  )}
                  <button 
                    onClick={() => updateApiConfig(apiConfig)}
                    disabled={isSaving}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Saving...' : 'Save API Settings'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Adzuna Config */}
                <div className="p-6 rounded-2xl border bg-background space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold">Adzuna Settings</h4>
                    <button
                      onClick={() => setApiConfig({...apiConfig, adzuna: {...apiConfig.adzuna, enabled: !apiConfig.adzuna.enabled}})}
                      className={`w-12 h-6 rounded-full transition-all relative border ${apiConfig.adzuna.enabled ? 'bg-primary border-primary' : 'bg-muted-foreground/40 border-border'}`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-background shadow-sm border border-border transition-all ${apiConfig.adzuna.enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">App ID</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                        value={apiConfig.adzuna.appId}
                        onChange={e => setApiConfig({...apiConfig, adzuna: {...apiConfig.adzuna, appId: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">App Key</label>
                      <input 
                        type="password"
                        className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                        value={apiConfig.adzuna.appKey}
                        onChange={e => setApiConfig({...apiConfig, adzuna: {...apiConfig.adzuna, appKey: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>

                {/* JSearch Config */}
                <div className="p-6 rounded-2xl border bg-background space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold">JSearch Settings</h4>
                    <button
                      onClick={() => setApiConfig({...apiConfig, jsearch: {...apiConfig.jsearch, enabled: !apiConfig.jsearch.enabled}})}
                      className={`w-12 h-6 rounded-full transition-all relative border ${apiConfig.jsearch.enabled ? 'bg-primary border-primary' : 'bg-muted-foreground/40 border-border'}`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-background shadow-sm border border-border transition-all ${apiConfig.jsearch.enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">RapidAPI Key</label>
                      <input 
                        type="password"
                        className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                        value={apiConfig.jsearch.apiKey}
                        onChange={e => setApiConfig({...apiConfig, jsearch: {...apiConfig.jsearch, apiKey: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">API Host</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                        value={apiConfig.jsearch.host}
                        onChange={e => setApiConfig({...apiConfig, jsearch: {...apiConfig.jsearch, host: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>

                {/* Google Jobs Config */}
                <div className="p-6 rounded-2xl border bg-background space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold">Google Jobs Settings</h4>
                    <button
                      onClick={() => setApiConfig({...apiConfig, google: {...apiConfig.google, enabled: !apiConfig.google.enabled}})}
                      className={`w-12 h-6 rounded-full transition-all relative border ${apiConfig.google.enabled ? 'bg-primary border-primary' : 'bg-muted-foreground/40 border-border'}`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-background shadow-sm border border-border transition-all ${apiConfig.google.enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">RapidAPI Key</label>
                      <input 
                        type="password"
                        className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                        value={apiConfig.google.apiKey}
                        onChange={e => setApiConfig({...apiConfig, google: {...apiConfig.google, apiKey: e.target.value}})}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">API Host</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                        value={apiConfig.google.host}
                        onChange={e => setApiConfig({...apiConfig, google: {...apiConfig.google, host: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl space-y-8 pb-20">
          <div className="p-8 rounded-2xl border bg-card space-y-8">
            <h2 className="text-2xl font-bold">Platform Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website Name</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border bg-background"
                    value={settings.siteName}
                    onChange={e => setSettings({...settings, siteName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Website Logo URL</label>
                    <span className="text-[10px] text-muted-foreground">Recommended: 250 x 80 px</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="https://example.com/logo.png"
                      className="flex-1 px-4 py-2 rounded-lg border bg-background"
                      value={settings.siteLogo}
                      onChange={e => setSettings({...settings, siteLogo: e.target.value})}
                    />
                    <label className="cursor-pointer bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-2 text-sm font-medium">
                      <ImageIcon size={16} />
                      Upload
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleSettingsImageUpload(e, 'siteLogo')} />
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Website Icon (Favicon URL)</label>
                    <span className="text-[10px] text-muted-foreground">Recommended: 32 x 32 px</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="https://example.com/favicon.ico"
                      className="flex-1 px-4 py-2 rounded-lg border bg-background"
                      value={settings.siteIcon}
                      onChange={e => setSettings({...settings, siteIcon: e.target.value})}
                    />
                    <label className="cursor-pointer bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-2 text-sm font-medium">
                      <ImageIcon size={16} />
                      Upload
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleSettingsImageUpload(e, 'siteIcon')} />
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">SEO Share Image (OG Image URL)</label>
                    <span className="text-[10px] text-muted-foreground">Recommended: 1200 x 630 px</span>
                  </div>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="https://example.com/og-image.jpg"
                      className="flex-1 px-4 py-2 rounded-lg border bg-background"
                      value={settings.seoImage}
                      onChange={e => setSettings({...settings, seoImage: e.target.value})}
                    />
                    <label className="cursor-pointer bg-primary/10 text-primary px-4 py-2 rounded-lg hover:bg-primary/20 transition-colors flex items-center gap-2 text-sm font-medium">
                      <ImageIcon size={16} />
                      Upload
                      <input type="file" className="hidden" accept="image/*" onChange={e => handleSettingsImageUpload(e, 'seoImage')} />
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website Description</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border bg-background resize-none"
                    value={settings.siteDescription}
                    onChange={e => setSettings({...settings, siteDescription: e.target.value})}
                  ></textarea>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SEO Title</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border bg-background"
                    value={settings.seoTitle}
                    onChange={e => setSettings({...settings, seoTitle: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SEO Description</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-2 rounded-lg border bg-background resize-none"
                    value={settings.seoDescription}
                    onChange={e => setSettings({...settings, seoDescription: e.target.value})}
                  ></textarea>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SEO Keywords (comma separated)</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border bg-background"
                    value={settings.seoKeywords}
                    onChange={e => setSettings({...settings, seoKeywords: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Email</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="email"
                      className="flex-1 px-4 py-2 rounded-lg border bg-background"
                      value={settings.contactEmail}
                      onChange={e => setSettings({...settings, contactEmail: e.target.value})}
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={settings.hideContactEmail}
                        onChange={e => setSettings({...settings, hideContactEmail: e.target.checked})}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-medium">Hide</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Phone</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="text"
                      className="flex-1 px-4 py-2 rounded-lg border bg-background"
                      value={settings.contactPhone}
                      onChange={e => setSettings({...settings, contactPhone: e.target.value})}
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={settings.hideContactPhone}
                        onChange={e => setSettings({...settings, hideContactPhone: e.target.checked})}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-xs font-medium">Hide</span>
                    </label>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contact Address</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border bg-background"
                    value={settings.contactAddress}
                    onChange={e => setSettings({...settings, contactAddress: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Featured Countries (comma separated codes, e.g. gb, us, ca)</label>
                  <input 
                    type="text"
                    className="w-full px-4 py-2 rounded-lg border bg-background"
                    value={settings.featuredCountries.join(', ')}
                    onChange={e => setSettings({...settings, featuredCountries: e.target.value.split(',').map(c => c.trim().toLowerCase()).filter(c => c)})}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-bold">Global AdSense</p>
                    <p className="text-sm text-muted-foreground">Toggle all ad slots.</p>
                  </div>
                  <button
                    onClick={toggleAds}
                    className={`w-14 h-7 rounded-full transition-all relative border ${settings.adsEnabled ? 'bg-primary border-primary' : 'bg-muted-foreground/40 border-border'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-background shadow-lg border border-border transition-all ${settings.adsEnabled ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border bg-destructive/5 border-destructive/20">
                  <div className="space-y-1">
                    <p className="font-bold text-destructive">Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">Disable site for users.</p>
                  </div>
                  <button
                    onClick={toggleMaintenance}
                    className={`w-14 h-7 rounded-full transition-all relative border ${settings.maintenanceMode ? 'bg-destructive border-destructive' : 'bg-muted-foreground/40 border-border'}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 rounded-full bg-background shadow-lg border border-border transition-all ${settings.maintenanceMode ? 'right-1' : 'left-1'}`}></div>
                  </button>
                </div>

                <div className="space-y-4">
                  <p className="font-bold">Social Links</p>
                  <div className="space-y-3">
                    <input 
                      type="text" placeholder="Facebook URL"
                      className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                      value={settings.socialLinks.facebook}
                      onChange={e => setSettings({...settings, socialLinks: {...settings.socialLinks, facebook: e.target.value}})}
                    />
                    <input 
                      type="text" placeholder="X (Twitter) URL"
                      className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                      value={settings.socialLinks.twitter}
                      onChange={e => setSettings({...settings, socialLinks: {...settings.socialLinks, twitter: e.target.value}})}
                    />
                    <input 
                      type="text" placeholder="Instagram URL"
                      className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                      value={settings.socialLinks.instagram}
                      onChange={e => setSettings({...settings, socialLinks: {...settings.socialLinks, instagram: e.target.value}})}
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <p className="font-bold">AdSense Configuration</p>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Publisher ID (ca-pub-xxx)</label>
                      <input 
                        type="text" placeholder="Publisher ID"
                        className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                        value={settings.adsenseConfig.publisherId}
                        onChange={e => setSettings({...settings, adsenseConfig: {...settings.adsenseConfig, publisherId: e.target.value}})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Header Slot ID</label>
                        <input 
                          type="text" placeholder="Header Slot"
                          className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                          value={settings.adsenseConfig.headerSlotId}
                          onChange={e => setSettings({...settings, adsenseConfig: {...settings.adsenseConfig, headerSlotId: e.target.value}})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Sidebar Slot ID</label>
                        <input 
                          type="text" placeholder="Sidebar Slot"
                          className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                          value={settings.adsenseConfig.sidebarSlotId}
                          onChange={e => setSettings({...settings, adsenseConfig: {...settings.adsenseConfig, sidebarSlotId: e.target.value}})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Footer Slot ID</label>
                        <input 
                          type="text" placeholder="Footer Slot"
                          className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                          value={settings.adsenseConfig.footerSlotId}
                          onChange={e => setSettings({...settings, adsenseConfig: {...settings.adsenseConfig, footerSlotId: e.target.value}})}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Job Details Slot ID</label>
                        <input 
                          type="text" placeholder="Job Details Slot"
                          className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                          value={settings.adsenseConfig.jobDetailsSlotId}
                          onChange={e => setSettings({...settings, adsenseConfig: {...settings.adsenseConfig, jobDetailsSlotId: e.target.value}})}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <p className="font-bold">Header Configuration</p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Header Links (JSON format: {'[{"label": "Name", "href": "/path"}]'})</label>
                      <textarea 
                        rows={4}
                        className="w-full px-4 py-2 rounded-lg border bg-background text-sm font-mono"
                        value={JSON.stringify(settings.headerLinks, null, 2)}
                        onChange={e => {
                          try {
                            const links = JSON.parse(e.target.value);
                            setSettings({...settings, headerLinks: links});
                          } catch (err) {}
                        }}
                      ></textarea>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">Footer Configuration</p>
                    <button 
                      onClick={resetFooterLinks}
                      disabled={isResettingFooter}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      {isResettingFooter ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      Reset to Default
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Footer Sections (JSON format: {'[{"title": "Section", "links": [{"label": "Name", "href": "/path"}]}]'})</label>
                      <textarea 
                        rows={6}
                        className="w-full px-4 py-2 rounded-lg border bg-background text-sm font-mono"
                        value={JSON.stringify(settings.footerSections, null, 2)}
                        onChange={e => {
                          try {
                            const sections = JSON.parse(e.target.value);
                            setSettings({...settings, footerSections: sections});
                          } catch (err) {}
                        }}
                      ></textarea>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Footer Copyright Text</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-2 rounded-lg border bg-background"
                        value={settings.footerCopyright}
                        onChange={e => setSettings({...settings, footerCopyright: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Contact Address</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-2 rounded-lg border bg-background"
                        value={settings.contactAddress}
                        onChange={e => setSettings({...settings, contactAddress: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Contact Phone</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="text"
                          className="flex-1 px-4 py-2 rounded-lg border bg-background"
                          value={settings.contactPhone}
                          onChange={e => setSettings({...settings, contactPhone: e.target.value})}
                        />
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={settings.hideContactPhone}
                            onChange={e => setSettings({...settings, hideContactPhone: e.target.checked})}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                          <span className="text-xs font-medium">Hide</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <p className="font-bold">Custom Header Code</p>
                  <p className="text-xs text-muted-foreground">Inject code into the &lt;head&gt; (e.g. Google Analytics, Search Console).</p>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border bg-background text-sm font-mono"
                    placeholder="Paste your <script> or <meta> tags here..."
                    value={settings.headerCode}
                    onChange={e => setSettings({...settings, headerCode: e.target.value})}
                  ></textarea>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <p className="font-bold">AdSense Auto-Ads / Global Script</p>
                  <p className="text-xs text-muted-foreground">Inject AdSense auto-ads script or other ad-related header code.</p>
                  <textarea 
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border bg-background text-sm font-mono"
                    placeholder="Paste your AdSense script here..."
                    value={settings.adsenseCode}
                    onChange={e => setSettings({...settings, adsenseCode: e.target.value})}
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t flex items-center justify-end gap-4">
              {saveSuccess === 'Global settings saved successfully!' && (
                <span className="text-sm font-bold text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
                  <CheckCircle2 size={16} /> Settings Saved Successfully!
                </span>
              )}
              <button 
                onClick={() => updateGlobalSettings(settings)}
                disabled={isSaving}
                className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {isSaving ? 'Saving...' : 'Save Platform Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Pricing Plans Configuration */}
            <div className="p-8 rounded-3xl border bg-card space-y-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <DollarSign className="text-primary" />
                Pricing Plans Control
              </h2>
              <div className="space-y-8">
                {(['free', 'pro', 'premium'] as const).map((planKey) => (
                  <div key={planKey} className="p-6 rounded-2xl border bg-muted/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold capitalize">{planKey} Plan</h3>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium w-24">Monthly ($)</label>
                          <input 
                            type="number"
                            className="w-20 px-2 py-1 rounded border bg-background text-sm"
                            value={settings.pricingPlans[planKey].price}
                            onChange={e => setSettings({
                              ...settings, 
                              pricingPlans: {
                                ...settings.pricingPlans, 
                                [planKey]: {...settings.pricingPlans[planKey], price: Number(e.target.value)}
                              }
                            })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-medium w-24">Yearly ($)</label>
                          <input 
                            type="number"
                            className="w-20 px-2 py-1 rounded border bg-background text-sm"
                            value={settings.pricingPlans[planKey].yearlyPrice || 0}
                            onChange={e => setSettings({
                              ...settings, 
                              pricingPlans: {
                                ...settings.pricingPlans, 
                                [planKey]: {...settings.pricingPlans[planKey], yearlyPrice: Number(e.target.value)}
                              }
                            })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Description</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                        value={settings.pricingPlans[planKey].description}
                        onChange={e => setSettings({
                          ...settings, 
                          pricingPlans: {
                            ...settings.pricingPlans, 
                            [planKey]: {...settings.pricingPlans[planKey], description: e.target.value}
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Features (one per line)</label>
                      <textarea 
                        rows={6}
                        className="w-full px-4 py-2 rounded-lg border bg-background text-sm resize-none"
                        value={settings.pricingPlans[planKey].features.join('\n')}
                        onChange={e => setSettings({
                          ...settings, 
                          pricingPlans: {
                            ...settings.pricingPlans, 
                            [planKey]: {...settings.pricingPlans[planKey], features: e.target.value.split('\n').filter(f => f.trim())}
                          }
                        })}
                      ></textarea>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Table Management */}
              <div className="pt-8 border-t space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold flex items-center gap-2">
                    <Layout className="text-primary" size={20} />
                    Plan Comparison Table
                  </h3>
                  <button 
                    onClick={() => setSettings({
                      ...settings,
                      comparisonTable: [...(settings.comparisonTable || []), { name: 'New Feature', free: false, pro: false, premium: false }]
                    })}
                    className="flex items-center gap-2 text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b">
                        <th className="pb-3 px-2">Feature Name</th>
                        <th className="pb-3 px-2 text-center">Free</th>
                        <th className="pb-3 px-2 text-center">Pro</th>
                        <th className="pb-3 px-2 text-center">Premium</th>
                        <th className="pb-3 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(settings.comparisonTable || []).map((row: any, i: number) => (
                        <tr key={i} className="group">
                          <td className="py-3 px-2">
                            <input 
                              type="text"
                              className="w-full bg-background border rounded px-1 transition-colors focus:ring-1 focus:ring-primary/30 p-1 text-sm font-medium"
                              value={row.name}
                              onChange={e => {
                                const newTable = [...settings.comparisonTable];
                                newTable[i].name = e.target.value;
                                setSettings({...settings, comparisonTable: newTable});
                              }}
                            />
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-col items-center gap-2">
                              <input 
                                type="text"
                                className="w-20 text-center bg-background border rounded px-1 py-0.5 text-[10px]"
                                value={typeof row.free === 'string' ? row.free : ''}
                                placeholder="Text value"
                                onChange={e => {
                                  const newTable = [...settings.comparisonTable];
                                  newTable[i].free = e.target.value;
                                  setSettings({...settings, comparisonTable: newTable});
                                }}
                              />
                              <button 
                                onClick={() => {
                                  const newTable = [...settings.comparisonTable];
                                  newTable[i].free = typeof row.free === 'boolean' ? !row.free : true;
                                  setSettings({...settings, comparisonTable: newTable});
                                }}
                                className={`w-8 h-4 rounded-full relative transition-all ${typeof row.free === 'boolean' && row.free ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                              >
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${typeof row.free === 'boolean' && row.free ? 'right-0.5' : 'left-0.5'}`}></div>
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-col items-center gap-2">
                              <input 
                                type="text"
                                className="w-20 text-center bg-background border rounded px-1 py-0.5 text-[10px]"
                                value={typeof row.pro === 'string' ? row.pro : ''}
                                placeholder="Text value"
                                onChange={e => {
                                  const newTable = [...settings.comparisonTable];
                                  newTable[i].pro = e.target.value;
                                  setSettings({...settings, comparisonTable: newTable});
                                }}
                              />
                              <button 
                                onClick={() => {
                                  const newTable = [...settings.comparisonTable];
                                  newTable[i].pro = typeof row.pro === 'boolean' ? !row.pro : true;
                                  setSettings({...settings, comparisonTable: newTable});
                                }}
                                className={`w-8 h-4 rounded-full relative transition-all ${typeof row.pro === 'boolean' && row.pro ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                              >
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${typeof row.pro === 'boolean' && row.pro ? 'right-0.5' : 'left-0.5'}`}></div>
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex flex-col items-center gap-2">
                              <input 
                                type="text"
                                className="w-20 text-center bg-background border rounded px-1 py-0.5 text-[10px]"
                                value={typeof row.premium === 'string' ? row.premium : ''}
                                placeholder="Text value"
                                onChange={e => {
                                  const newTable = [...settings.comparisonTable];
                                  newTable[i].premium = e.target.value;
                                  setSettings({...settings, comparisonTable: newTable});
                                }}
                              />
                              <button 
                                onClick={() => {
                                  const newTable = [...settings.comparisonTable];
                                  newTable[i].premium = typeof row.premium === 'boolean' ? !row.premium : true;
                                  setSettings({...settings, comparisonTable: newTable});
                                }}
                                className={`w-8 h-4 rounded-full relative transition-all ${typeof row.premium === 'boolean' && row.premium ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`}
                              >
                                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${typeof row.premium === 'boolean' && row.premium ? 'right-0.5' : 'left-0.5'}`}></div>
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button 
                              onClick={() => {
                                const newTable = settings.comparisonTable.filter((_: any, index: number) => index !== i);
                                setSettings({...settings, comparisonTable: newTable});
                              }}
                              className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Payment Gateways Configuration */}
            <div className="p-8 rounded-3xl border bg-card space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <CreditCard className="text-primary" />
                  Payment Gateways Setup
                </h2>
                <div className="flex items-center gap-3 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/20">
                  <span className="text-sm font-bold text-amber-700">Test Mode</span>
                  <button
                    onClick={() => updateGlobalSettings({
                      ...settings,
                      paymentGateways: { ...settings.paymentGateways, testMode: !settings.paymentGateways.testMode }
                    })}
                    className={`w-12 h-6 rounded-full transition-all relative border ${settings.paymentGateways.testMode ? 'bg-amber-500 border-amber-500' : 'bg-muted-foreground/40 border-border'}`}
                  >
                    <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-background shadow-lg border border-border transition-all ${settings.paymentGateways.testMode ? 'right-0.5' : 'left-0.5'}`}></div>
                  </button>
                </div>
              </div>
              <div className="space-y-8">
                {/* Stripe */}
                <div className="p-6 rounded-2xl border bg-muted/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">Stripe</h3>
                    <button
                      onClick={() => setSettings({
                        ...settings, 
                        paymentGateways: {
                          ...settings.paymentGateways, 
                          stripe: {...settings.paymentGateways.stripe, enabled: !settings.paymentGateways.stripe.enabled}
                        }
                      })}
                      className={`w-12 h-6 rounded-full transition-all relative border ${settings.paymentGateways.stripe.enabled ? 'bg-primary border-primary' : 'bg-muted-foreground/40 border-border'}`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-background shadow-lg border border-border transition-all ${settings.paymentGateways.stripe.enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input 
                      type="text" placeholder="Public Key (pk_...)"
                      className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                      value={settings.paymentGateways.stripe.publicKey}
                      onChange={e => {
                        const val = e.target.value;
                        if (val.startsWith('sk_')) {
                          alert('CRITICAL WARNING: You are entering a SECRET key (sk_...) in the PUBLIC key field. This is a security risk. Please use your Publishable key (pk_...) instead.');
                        }
                        setSettings({...settings, paymentGateways: {...settings.paymentGateways, stripe: {...settings.paymentGateways.stripe, publicKey: val}}})
                      }}
                    />
                    <input 
                      type="password" placeholder="Secret Key (sk_...)"
                      className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                      value={settings.paymentGateways.stripe.secretKey}
                      onChange={e => setSettings({...settings, paymentGateways: {...settings.paymentGateways, stripe: {...settings.paymentGateways.stripe, secretKey: e.target.value}}})}
                    />
                  </div>
                </div>

                {/* PayPal */}
                <div className="p-6 rounded-2xl border bg-muted/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">PayPal</h3>
                    <button
                      onClick={() => setSettings({
                        ...settings, 
                        paymentGateways: {
                          ...settings.paymentGateways, 
                          paypal: {...settings.paymentGateways.paypal, enabled: !settings.paymentGateways.paypal.enabled}
                        }
                      })}
                      className={`w-12 h-6 rounded-full transition-all relative border ${settings.paymentGateways.paypal.enabled ? 'bg-primary border-primary' : 'bg-muted-foreground/40 border-border'}`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-background shadow-lg border border-border transition-all ${settings.paymentGateways.paypal.enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input 
                      type="text" placeholder="Client ID"
                      className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                      value={settings.paymentGateways.paypal.clientId}
                      onChange={e => setSettings({...settings, paymentGateways: {...settings.paymentGateways, paypal: {...settings.paymentGateways.paypal, clientId: e.target.value}}})}
                    />
                    <input 
                      type="password" placeholder="Secret Key"
                      className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                      value={settings.paymentGateways.paypal.secretKey}
                      onChange={e => setSettings({...settings, paymentGateways: {...settings.paymentGateways, paypal: {...settings.paymentGateways.paypal, secretKey: e.target.value}}})}
                    />
                  </div>
                </div>

                {/* Razorpay */}
                <div className="p-6 rounded-2xl border bg-muted/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2">Razorpay</h3>
                    <button
                      onClick={() => setSettings({
                        ...settings, 
                        paymentGateways: {
                          ...settings.paymentGateways, 
                          razorpay: {...settings.paymentGateways.razorpay, enabled: !settings.paymentGateways.razorpay.enabled}
                        }
                      })}
                      className={`w-12 h-6 rounded-full transition-all relative border ${settings.paymentGateways.razorpay.enabled ? 'bg-primary border-primary' : 'bg-muted-foreground/40 border-border'}`}
                    >
                      <div className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-background shadow-lg border border-border transition-all ${settings.paymentGateways.razorpay.enabled ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>
                  <div className="space-y-3">
                    <input 
                      type="text" placeholder="Key ID"
                      className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                      value={settings.paymentGateways.razorpay.keyId}
                      onChange={e => setSettings({...settings, paymentGateways: {...settings.paymentGateways, razorpay: {...settings.paymentGateways.razorpay, keyId: e.target.value}}})}
                    />
                    <input 
                      type="password" placeholder="Key Secret"
                      className="w-full px-4 py-2 rounded-lg border bg-background text-sm"
                      value={settings.paymentGateways.razorpay.keySecret}
                      onChange={e => setSettings({...settings, paymentGateways: {...settings.paymentGateways, razorpay: {...settings.paymentGateways.razorpay, keySecret: e.target.value}}})}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t flex items-center justify-end gap-4">
            {saveSuccess === 'Global settings saved successfully!' && (
              <span className="text-sm font-bold text-emerald-500 flex items-center gap-1 animate-in fade-in slide-in-from-right-4">
                <CheckCircle2 size={16} /> Billing Config Saved!
              </span>
            )}
            <button 
              onClick={() => updateGlobalSettings(settings)}
              disabled={isSaving}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              {isSaving ? 'Saving...' : 'Save Billing Configuration'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Payment Transactions</h2>
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-xl">
              <CreditCard size={16} />
              Total Transactions: {transactions.length}
            </div>
          </div>

          <div className="bg-card rounded-3xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b bg-muted/30">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">User</th>
                    <th className="py-4 px-6">Plan</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Method</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Transaction ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map(txn => (
                    <tr key={txn.id} className="text-sm hover:bg-muted/30 transition-colors">
                      <td className="py-4 px-6 whitespace-nowrap">
                        {txn.createdAt?.seconds ? new Date(txn.createdAt.seconds * 1000).toLocaleString() : 'Pending'}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-medium">{txn.userEmail}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{txn.userId}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium">{txn.planName}</span>
                        <span className="text-[10px] text-muted-foreground ml-1 uppercase">({txn.billingCycle})</span>
                      </td>
                      <td className="py-4 px-6 font-bold text-primary">
                        ${txn.amount}
                      </td>
                      <td className="py-4 px-6 capitalize">
                        {txn.paymentMethod}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                          txn.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-xs text-muted-foreground">
                        {txn.transactionId}
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-muted-foreground italic">
                        No payment transactions recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'help' && (
        <div className="max-w-4xl space-y-8 pb-20">
          <div className="p-8 rounded-3xl border bg-card space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ShieldAlert className="text-primary" />
                Admin Help & Documentation
              </h2>
              <p className="text-muted-foreground">Learn how to manage your platform effectively.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-lg border-b pb-2">Website Customization</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <p className="font-bold text-sm">Site Identity</p>
                      <p className="text-xs text-muted-foreground mt-1">Go to <strong>Settings</strong> tab to change site name, logo, favicon, and SEO meta tags.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <p className="font-bold text-sm">Navigation</p>
                      <p className="text-xs text-muted-foreground mt-1">Use <strong>Navigation</strong> tab to add/remove links from the header and footer sections.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <p className="font-bold text-sm">Static Pages</p>
                      <p className="text-xs text-muted-foreground mt-1">Edit About Us, Privacy Policy, etc., in the <strong>Pages</strong> tab using the Rich Text or HTML editor.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold text-lg border-b pb-2">Monetization</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <p className="font-bold text-sm">Pricing Plans</p>
                      <p className="text-xs text-muted-foreground mt-1">Configure plan prices and features in the <strong>Billing</strong> tab.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <p className="font-bold text-sm">AdSense</p>
                      <p className="text-xs text-muted-foreground mt-1">Enter your Publisher ID and Slot IDs in <strong>Settings</strong> to enable global advertisements.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-bold text-lg border-b pb-2">Data Management</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <p className="font-bold text-sm">Job Listings</p>
                      <p className="text-xs text-muted-foreground mt-1">Manage manual jobs in the <strong>Jobs</strong> tab. You can mark them as Featured or Spam.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <p className="font-bold text-sm">User Control</p>
                      <p className="text-xs text-muted-foreground mt-1">Search and manage user roles (Admin/User) in the <strong>Users</strong> tab.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border">
                      <p className="font-bold text-sm">API Integration</p>
                      <p className="text-xs text-muted-foreground mt-1">Test and configure external job board APIs (Adzuna, JSearch) in the <strong>API</strong> tab.</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
                  <h3 className="font-bold text-primary flex items-center gap-2">
                    <Zap size={18} />
                    Pro Tip
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Always use the <strong>Test Connection</strong> button in the API tab before saving your settings to ensure your RapidAPI keys are working correctly.
                  </p>
                  <p className="text-sm leading-relaxed">
                    If you accidentally break a static page, you can use the <strong>Reset to Default</strong> button in the Pages editor to restore the original content.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {isAddingJob && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-card rounded-3xl border shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b flex items-center justify-between bg-muted/30">
                <h2 className="text-xl font-bold">{editingJob ? 'Edit Job' : 'Add New Job'}</h2>
                <button onClick={() => setIsAddingJob(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveJob} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Image Upload */}
                <div className="space-y-4">
                  <label className="text-sm font-medium">Company Logo</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative w-full h-40 rounded-2xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 transition-colors cursor-pointer overflow-hidden flex flex-col items-center justify-center gap-2 bg-muted/10"
                  >
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white font-bold text-sm">Change Image</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-muted-foreground">
                          <ImageIcon size={24} />
                        </div>
                        <p className="text-sm text-muted-foreground">Click to upload logo</p>
                      </>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleImageChange}
                    className="hidden" 
                    accept="image/*"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Job Title</label>
                      <span className="text-[10px] text-muted-foreground font-mono">{(jobForm.title || '').length}/100</span>
                    </div>
                    <input 
                      type="text" required
                      maxLength={100}
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={jobForm.title}
                      onChange={e => setJobForm({...jobForm, title: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Company Name</label>
                      <span className="text-[10px] text-muted-foreground font-mono">{(jobForm.company || '').length}/100</span>
                    </div>
                    <input 
                      type="text" required
                      maxLength={100}
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={jobForm.company}
                      onChange={e => setJobForm({...jobForm, company: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <input 
                      type="text" required
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={jobForm.location}
                      onChange={e => setJobForm({...jobForm, location: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Country Code (e.g. gb, us)</label>
                    <input 
                      type="text" required
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={jobForm.country}
                      onChange={e => setJobForm({...jobForm, country: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Salary Range</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={jobForm.salary}
                      onChange={e => setJobForm({...jobForm, salary: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Job Type</label>
                    <select 
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={jobForm.jobType}
                      onChange={e => setJobForm({...jobForm, jobType: e.target.value as any})}
                    >
                      <option value="On-site">On-site</option>
                      <option value="Remote">Remote</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Apply URL</label>
                  <input 
                    type="url" required
                    className="w-full px-4 py-2 rounded-lg border bg-background"
                    value={jobForm.applyUrl}
                    onChange={e => setJobForm({...jobForm, applyUrl: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Description (Rich Text Editor)</label>
                  <div className="bg-background rounded-lg overflow-hidden border">
                    <ReactQuill 
                      theme="snow"
                      value={jobForm.description}
                      onChange={(content) => setJobForm({...jobForm, description: content})}
                      modules={quillModules}
                      formats={quillFormats}
                      className="h-64 mb-12"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/20">
                    <input 
                      type="checkbox" 
                      id="isFeatured"
                      className="w-5 h-5 rounded text-primary"
                      checked={jobForm.isFeatured}
                      onChange={e => setJobForm({...jobForm, isFeatured: e.target.checked})}
                    />
                    <label htmlFor="isFeatured" className="font-bold cursor-pointer">Feature this job</label>
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-xl border bg-destructive/5 border-destructive/20">
                    <input 
                      type="checkbox" 
                      id="isSpam"
                      className="w-5 h-5 rounded text-destructive"
                      checked={jobForm.isSpam}
                      onChange={e => setJobForm({...jobForm, isSpam: e.target.checked})}
                    />
                    <label htmlFor="isSpam" className="font-bold cursor-pointer text-destructive">Mark as Spam</label>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {editingJob ? 'Update Job' : 'Post Job Now'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddingJob(false)}
                    className="px-8 py-3 rounded-xl border font-bold hover:bg-accent transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Page Editor Modal */}
        {editingPage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-5xl bg-card rounded-3xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold">Edit Page: {editingPage.title}</h2>
                  <button 
                    type="button"
                    onClick={resetSinglePage}
                    className="text-xs font-bold text-destructive hover:underline flex items-center gap-1"
                  >
                    <X size={14} />
                    Reset to Default
                  </button>
                </div>
                <button onClick={() => { setEditingPage(null); setIsHtmlMode(false); }} className="p-2 hover:bg-muted rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSavePage} className="p-8 overflow-y-auto space-y-8">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Page Title</label>
                  <input 
                    type="text" required
                    className="w-full px-4 py-2 rounded-lg border bg-background"
                    value={editingPage.title}
                    onChange={e => setEditingPage({...editingPage, title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Page Content</label>
                    <button 
                      type="button"
                      onClick={() => setIsHtmlMode(!isHtmlMode)}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Layout size={14} />
                      {isHtmlMode ? 'Switch to Rich Text' : 'Switch to HTML Editor'}
                    </button>
                  </div>
                  <div className="bg-background rounded-lg overflow-hidden border">
                    {isHtmlMode ? (
                      <textarea
                        className="w-full h-[450px] p-6 font-mono text-sm bg-background border-none focus:ring-0 resize-none"
                        value={editingPage.content}
                        onChange={(e) => setEditingPage({...editingPage, content: e.target.value})}
                        placeholder="Enter raw HTML here..."
                      />
                    ) : (
                      <ReactQuill 
                        theme="snow"
                        value={editingPage.content}
                        onChange={(content) => setEditingPage({...editingPage, content: content})}
                        modules={quillModules}
                        formats={quillFormats}
                        className="h-[400px] mb-12"
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                    {isSaving ? 'Saving...' : 'Save Page Content'}
                  </button>
                  <button 
                    type="button"
                    disabled={isSaving}
                    onClick={() => { setEditingPage(null); setIsHtmlMode(false); }}
                    className="flex-1 bg-muted hover:bg-muted/80 py-4 rounded-2xl font-bold transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {userToDelete && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card border rounded-2xl shadow-2xl max-w-md w-full p-8 space-y-6"
            >
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center text-destructive mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold">Delete User?</h3>
                <p className="text-muted-foreground">
                  Are you sure you want to delete this user? This action is permanent and cannot be undone.
                </p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 py-3 bg-muted hover:bg-muted/80 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await deleteDoc(doc(db, 'users', userToDelete));
                      setUsersList(usersList.filter(u => u.id !== userToDelete));
                      setUserToDelete(null);
                    } catch (error) {
                      console.error('Error deleting user:', error);
                    }
                  }}
                  className="flex-1 py-3 bg-destructive text-white rounded-xl font-bold hover:bg-destructive/90 transition-all"
                >
                  Delete User
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
