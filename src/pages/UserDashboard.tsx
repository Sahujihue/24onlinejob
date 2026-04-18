import React, { useState, useEffect, FormEvent, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';
import { db, auth } from '../firebase';
import { 
  collection, query, getDocs, doc, updateDoc, 
  addDoc, deleteDoc, serverTimestamp, where, orderBy,
  arrayUnion, arrayRemove
} from 'firebase/firestore';
import { 
  User, Briefcase, Plus, Trash2, Edit, ExternalLink,
  Loader2, CreditCard, CheckCircle2, Image as ImageIcon,
  X, Save, Zap, Star, ShieldCheck, DollarSign, History,
  Clock, CheckCircle, XCircle, AlertCircle, Bell, Settings2,
  Sparkles, RefreshCw, LogOut, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Job, JobApplication, ApplicationStatus, JobAlert } from '../types';
import { fetchAllJobs } from '../lib/api';
import ReactQuill from 'react-quill-new';

export default function UserDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const plans = (Object.values(settings.pricingPlans) as any[]).sort((a, b) => a.price - b.price);
  const [userJobs, setUserJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [alerts, setAlerts] = useState<JobAlert[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [recommendationKeywords, setRecommendationKeywords] = useState<string[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'subscription' | 'applications' | 'alerts' | 'settings'>('overview');
  const [isAddingJob, setIsAddingJob] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [isAddingApplication, setIsAddingApplication] = useState(false);
  const [editingApplication, setEditingApplication] = useState<JobApplication | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    imageUrl: ''
  });

  const [applicationForm, setApplicationForm] = useState<Partial<JobApplication>>({
    jobTitle: '',
    company: '',
    status: 'Applied',
    appliedAt: new Date().toISOString().split('T')[0],
    notes: '',
    applicationUrl: '',
    estimatedSalary: ''
  });

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const calculateProfileStrength = () => {
    if (!profile) return { score: 0, missing: [] };
    
    let score = 0;
    const items = [
      { key: 'displayName', weight: 15, label: 'Full Name' },
      { key: 'photoURL', weight: 15, label: 'Profile Picture' },
      { key: 'location', weight: 15, label: 'Location' },
      { key: 'bio', weight: 20, label: 'Bio' },
      { key: 'phoneNumber', weight: 10, label: 'Phone Number' },
      { key: 'website', weight: 10, label: 'Website' },
      { key: 'preferredKeywords', weight: 15, label: 'Keywords/Skills' }
    ];

    const missing = [];
    for (const item of items) {
      const val = profile[item.key as keyof typeof profile];
      if (Array.isArray(val) ? val.length > 0 : !!val) {
        score += item.weight;
      } else {
        missing.push(item);
      }
    }
    return { score, missing };
  };

  const profileStrength = calculateProfileStrength();

  useEffect(() => {
    if (authLoading || !user) return;

    const loadData = async () => {
      setLoading(true);
      try {
        // Load User Jobs
        const jobsQ = query(
          collection(db, 'jobs'),
          where('authorUid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const jobsSnap = await getDocs(jobsQ);
        setUserJobs(jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Job)));

        // Load Applications
        const appsQ = query(
          collection(db, 'users', user.uid, 'applications'),
          orderBy('appliedAt', 'desc')
        );
        const appsSnap = await getDocs(appsQ);
        setApplications(appsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication)));

        // Load Alerts
        const alertsSnap = await getDocs(collection(db, 'users', user.uid, 'alerts'));
        setAlerts(alertsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobAlert)));

        // Load Transactions
        try {
          const transQ = query(
            collection(db, 'transactions'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const transSnap = await getDocs(transQ);
          setTransactions(transSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (transError) {
          console.error('Error loading transactions:', transError);
          setTransactions([]);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, authLoading]);

  useEffect(() => {
    if (!profile) return;

    const fetchRecommendations = async () => {
      setLoadingRecommendations(true);
      try {
        const keywords = profile.preferredKeywords?.length 
          ? profile.preferredKeywords 
          : (profile.searchHistory?.slice(-5) || []);
        
        setRecommendationKeywords(keywords);

        if (keywords.length > 0) {
          const queryStr = keywords.join(' ');
          const results = await fetchAllJobs({
            query: queryStr,
            country: profile.featuredCountries?.[0] || 'gb',
            page: 1
          });
          // Filter out jobs the user already posted or saved if possible
          setRecommendedJobs(results.slice(0, 6));
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoadingRecommendations(false);
      }
    };

    fetchRecommendations();
  }, [profile?.preferredKeywords, profile?.searchHistory]);

  const handleAddKeyword = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !newKeyword.trim()) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        preferredKeywords: arrayUnion(newKeyword.trim())
      });
      setNewKeyword('');
    } catch (error) {
      console.error('Error adding keyword:', error);
    }
  };

  const handleRemoveKeyword = async (keyword: string) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        preferredKeywords: arrayRemove(keyword)
      });
    } catch (error) {
      console.error('Error removing keyword:', error);
    }
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
    if (!user) return;

    try {
      if (editingJob) {
        await updateDoc(doc(db, 'jobs', editingJob.id), {
          ...jobForm,
          updatedAt: serverTimestamp()
        });
        setUserJobs(userJobs.map(j => j.id === editingJob.id ? { ...j, ...jobForm } as Job : j));
      } else {
        const docRef = await addDoc(collection(db, 'jobs'), {
          ...jobForm,
          authorUid: user.uid,
          createdAt: serverTimestamp(),
          source: 'User'
        });
        setUserJobs([{ id: docRef.id, ...jobForm, authorUid: user.uid, source: 'User' } as Job, ...userJobs]);
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
        imageUrl: ''
      });
    } catch (error) {
      console.error('Error saving job:', error);
    }
  };

  const handleDeleteJob = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'jobs', id));
      setUserJobs(userJobs.filter(j => j.id !== id));
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const handleSaveApplication = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingApplication) {
        await updateDoc(doc(db, 'users', user.uid, 'applications', editingApplication.id), {
          ...applicationForm,
          updatedAt: serverTimestamp()
        });
        setApplications(applications.map(a => a.id === editingApplication.id ? { ...a, ...applicationForm } as JobApplication : a));
      } else {
        const docRef = await addDoc(collection(db, 'users', user.uid, 'applications'), {
          ...applicationForm,
          userId: user.uid,
          appliedAt: new Date(applicationForm.appliedAt || Date.now()).toISOString()
        });
        setApplications([{ 
          id: docRef.id, 
          ...applicationForm, 
          userId: user.uid, 
          appliedAt: new Date(applicationForm.appliedAt || Date.now()).toISOString() 
        } as JobApplication, ...applications]);
      }
      setIsAddingApplication(false);
      setEditingApplication(null);
      setApplicationForm({
        jobTitle: '',
        company: '',
        status: 'Applied',
        appliedAt: new Date().toISOString().split('T')[0],
        notes: '',
        applicationUrl: '',
        estimatedSalary: ''
      });
    } catch (error) {
      console.error('Error saving application:', error);
    }
  };

  const handleDeleteApplication = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'applications', id));
      setApplications(applications.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting application:', error);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'alerts', id));
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const handleToggleAlert = async (alert: JobAlert) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'alerts', alert.id), {
        isActive: !alert.isActive
      });
      setAlerts(alerts.map(a => a.id === alert.id ? { ...a, isActive: !a.isActive } : a));
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  };

  const handleUpdateApplicationStatus = async (id: string, status: ApplicationStatus) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid, 'applications', id), {
        status,
        updatedAt: serverTimestamp()
      });
      setApplications(applications.map(a => a.id === id ? { ...a, status } : a));
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) return;
    navigate(`/checkout?plan=${planId}&cycle=${billingCycle}`);
  };

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Please sign in to access your dashboard.</h1>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{profile?.displayName || 'User Dashboard'}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-muted p-1 rounded-xl overflow-x-auto no-scrollbar">
          {(['overview', 'jobs', 'applications', 'alerts', 'subscription', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize whitespace-nowrap ${
                activeTab === tab ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            {profileStrength.score < 100 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-3xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-120 transition-transform duration-500">
                  <User size={120} />
                </div>
                <div className="space-y-2 relative">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/20 rounded-lg">
                      <Sparkles size={16} className="text-primary" />
                    </div>
                    <h3 className="font-bold text-lg">Complete Your Profile</h3>
                  </div>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    A complete profile helps us suggest better jobs for you. You're currently at {profileStrength.score}% strength.
                  </p>
                </div>
                <div className="flex items-center gap-4 relative">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 text-primary/60">Help us find better jobs</p>
                    <div className="flex flex-wrap gap-1.5 justify-end max-w-[250px]">
                      {profileStrength.missing.map((item) => (
                        <button 
                          key={item.key}
                          onClick={() => navigate(`/profile#${item.key}`)}
                          className="text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2.5 py-1 rounded-full font-bold transition-all hover:scale-105 active:scale-95"
                          title={`Click to fill ${item.label}`}
                        >
                          + {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => navigate('/profile')}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                  >
                    Complete Profile
                    <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            )}

            <div className="p-8 rounded-3xl border bg-card space-y-6">
              <h2 className="text-xl font-bold">Your Subscription</h2>
              <div className="flex items-center justify-between p-6 rounded-2xl bg-muted/30 border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <Zap size={24} />
                  </div>
                  <div>
                    <p className="font-bold capitalize">{profile?.subscriptionStatus || 'Free'} Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {profile?.subscriptionExpiresAt 
                        ? `Expires on ${new Date(profile.subscriptionExpiresAt).toLocaleDateString()}`
                        : 'No active subscription'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('subscription')}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Upgrade Plan
                </button>
              </div>
            </div>

            <div className="p-8 rounded-3xl border bg-card space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={24} className="text-amber-500" />
                  <h2 className="text-xl font-bold">Recommended for You</h2>
                </div>
                <button 
                  onClick={() => setIsRefining(!isRefining)}
                  className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Settings2 size={16} />
                  Refine
                </button>
              </div>

              <AnimatePresence>
                {isRefining && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4"
                  >
                    <div className="p-4 rounded-2xl bg-muted/30 border space-y-3">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Your Interests</p>
                      <div className="flex flex-wrap gap-2">
                        {recommendationKeywords.map(kw => (
                          <span key={kw} className="inline-flex items-center gap-1 px-3 py-1 bg-background border rounded-full text-xs font-medium">
                            {kw}
                            <button onClick={() => handleRemoveKeyword(kw)} className="hover:text-destructive">
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                        {recommendationKeywords.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">No keywords yet. Search for jobs to see recommendations.</p>
                        )}
                      </div>
                      <form onSubmit={handleAddKeyword} className="flex gap-2">
                        <input 
                          type="text"
                          placeholder="Add a skill or job title..."
                          className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-primary"
                          value={newKeyword}
                          onChange={e => setNewKeyword(e.target.value)}
                        />
                        <button type="submit" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold">
                          Add
                        </button>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {loadingRecommendations ? (
                  <div className="col-span-full py-12 flex flex-col items-center justify-center gap-3">
                    <Loader2 size={32} className="animate-spin text-primary/40" />
                    <p className="text-sm text-muted-foreground">Finding the best matches...</p>
                  </div>
                ) : recommendedJobs.length > 0 ? (
                  recommendedJobs.map(job => (
                    <div 
                      key={job.id} 
                      onClick={() => navigate(`/jobs/${job.id}`, { state: { job } })}
                      className="p-4 rounded-2xl border bg-background hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {job.imageUrl ? (
                          <img src={job.imageUrl} alt={job.company} className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                            <Briefcase size={20} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{job.title}</h4>
                          <p className="text-xs text-muted-foreground truncate">{job.company}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">{job.salary || 'Competitive'}</span>
                        <span>{job.location}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/40">
                      <Sparkles size={24} />
                    </div>
                    <p className="text-sm text-muted-foreground">Search for jobs or add keywords to see recommendations.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 rounded-3xl border bg-card space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Recent Job Posts</h2>
                <button 
                  onClick={() => setActiveTab('jobs')}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {userJobs.slice(0, 3).map(job => (
                  <div key={job.id} className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      {job.imageUrl ? (
                        <img src={job.imageUrl} alt={job.title} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                          <Briefcase size={20} />
                        </div>
                      )}
                      <div>
                        <p className="font-bold">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.company} • {job.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => {
                        setEditingJob(job);
                        setJobForm(job);
                        setImagePreview(job.imageUrl || null);
                        setIsAddingJob(true);
                      }} className="p-2 hover:bg-accent rounded-lg text-muted-foreground">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeleteJob(job.id)} className="p-2 hover:bg-accent rounded-lg text-destructive">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {userJobs.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">You haven't posted any jobs yet.</p>
                )}
              </div>
            </div>

            <div className="p-8 rounded-3xl border bg-card space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Recent Applications</h2>
                <button 
                  onClick={() => setActiveTab('applications')}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {applications.slice(0, 3).map(app => (
                  <div key={app.id} className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                        <History size={20} />
                      </div>
                      <div>
                        <p className="font-bold">{app.jobTitle}</p>
                        <p className="text-xs text-muted-foreground">{app.company} • {app.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        app.status === 'Applied' ? 'bg-blue-100 text-blue-600' :
                        app.status === 'Interviewing' ? 'bg-amber-100 text-amber-600' :
                        app.status === 'Offered' ? 'bg-emerald-100 text-emerald-600' :
                        'bg-rose-100 text-rose-600'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))}
                {applications.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">You haven't tracked any applications yet.</p>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="p-8 rounded-3xl border bg-primary text-primary-foreground space-y-6">
              <h2 className="text-xl font-bold">Need to hire?</h2>
              <p className="text-sm opacity-90 leading-relaxed">
                Post your job listing today and reach thousands of qualified candidates worldwide.
              </p>
              <button 
                onClick={() => setIsAddingJob(true)}
                className="w-full py-3 bg-white text-primary rounded-xl font-bold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Post a Job
              </button>
            </div>

            <div className="p-8 rounded-3xl border bg-card space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Active Job Alerts</h2>
                <button 
                  onClick={() => setActiveTab('alerts')}
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Manage
                </button>
              </div>
              <div className="space-y-4">
                {alerts.slice(0, 2).map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-4 rounded-xl border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                        <Bell size={20} />
                      </div>
                      <div>
                        <p className="font-bold">{alert.filters.query || alert.filters.category || 'General Alert'}</p>
                        <p className="text-xs text-muted-foreground uppercase">{alert.filters.country} • {alert.frequency}</p>
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${alert.isActive ? 'bg-emerald-500' : 'bg-muted'}`} />
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground">No active alerts.</p>
                )}
              </div>
            </div>

            <div className="p-8 rounded-3xl border bg-card space-y-6">
              <h2 className="text-xl font-bold">Quick Links</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/help')}
                  className="w-full flex items-center justify-between p-4 rounded-xl border hover:bg-muted transition-all text-sm font-bold group"
                >
                  <span className="flex items-center gap-3">
                    <Sparkles size={18} className="text-primary" />
                    Help Center
                  </span>
                  <ExternalLink size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                <button 
                  onClick={() => setActiveTab('subscription')}
                  className="w-full flex items-center justify-between p-4 rounded-xl border hover:bg-muted transition-all text-sm font-bold group"
                >
                  <span className="flex items-center gap-3">
                    <CreditCard size={18} className="text-primary" />
                    Billing History
                  </span>
                  <History size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="w-full flex items-center justify-between p-4 rounded-xl border hover:bg-muted transition-all text-sm font-bold group"
                >
                  <span className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-primary" />
                    Account Settings
                  </span>
                  <Settings2 size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Your Job Postings</h2>
            <button 
              onClick={() => setIsAddingJob(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              Post New Job
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userJobs.map(job => (
              <div key={job.id} className="p-6 rounded-2xl border bg-card space-y-4 group">
                <div className="flex items-start justify-between">
                  {job.imageUrl ? (
                    <img src={job.imageUrl} alt={job.title} className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                      <Briefcase size={24} />
                    </div>
                  )}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {
                      setEditingJob(job);
                      setJobForm(job);
                      setImagePreview(job.imageUrl || null);
                      setIsAddingJob(true);
                    }} className="p-2 hover:bg-accent rounded-lg text-muted-foreground">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDeleteJob(job.id)} className="p-2 hover:bg-accent rounded-lg text-destructive">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-lg line-clamp-1">{job.title}</h3>
                  <p className="text-sm text-muted-foreground">{job.company}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="px-2 py-1 bg-muted rounded-md">{job.jobType}</span>
                  <span>{job.location}</span>
                </div>
              </div>
            ))}
            {userJobs.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                  <Briefcase size={40} />
                </div>
                <p className="text-muted-foreground">You haven't posted any jobs yet.</p>
                <button onClick={() => setIsAddingJob(true)} className="text-primary font-bold hover:underline">
                  Post your first job
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Application Tracker</h2>
            <button 
              onClick={() => setIsAddingApplication(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus size={18} />
              Add Application
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(['Applied', 'Interviewing', 'Offered', 'Rejected'] as ApplicationStatus[]).map(status => (
              <div key={status} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    {status === 'Applied' && <Clock size={16} className="text-blue-500" />}
                    {status === 'Interviewing' && <AlertCircle size={16} className="text-amber-500" />}
                    {status === 'Offered' && <CheckCircle size={16} className="text-emerald-500" />}
                    {status === 'Rejected' && <XCircle size={16} className="text-rose-500" />}
                    {status}
                  </h3>
                  <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full">
                    {applications.filter(a => a.status === status).length}
                  </span>
                </div>
                <div className="space-y-3">
                  {applications.filter(a => a.status === status).map(app => (
                    <div key={app.id} className="p-4 rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-bold text-sm leading-tight">{app.jobTitle}</h4>
                          <p className="text-xs text-muted-foreground">{app.company}</p>
                          {app.estimatedSalary && (
                            <p className="text-[10px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                              <DollarSign size={10} />
                              {app.estimatedSalary}
                            </p>
                          )}
                          {app.applicationUrl && (
                            <a 
                              href={app.applicationUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] text-primary hover:underline mt-1 flex items-center gap-1"
                            >
                              <ExternalLink size={10} />
                              View Link
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => {
                            setEditingApplication(app);
                            setApplicationForm(app);
                            setIsAddingApplication(true);
                          }} className="p-1 hover:bg-accent rounded text-muted-foreground">
                            <Edit size={12} />
                          </button>
                          <button onClick={() => handleDeleteApplication(app.id)} className="p-1 hover:bg-accent rounded text-destructive">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mt-3">
                        {(['Applied', 'Interviewing', 'Offered', 'Rejected'] as ApplicationStatus[]).map(s => (
                          <button
                            key={s}
                            onClick={() => handleUpdateApplicationStatus(app.id, s)}
                            className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all ${
                              app.status === s 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                            }`}
                          >
                            {s.charAt(0)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {applications.filter(a => a.status === status).length === 0 && (
                    <div className="py-8 border-2 border-dashed rounded-2xl flex items-center justify-center text-muted-foreground/40 italic text-xs">
                      No {status.toLowerCase()} yet
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Job Alerts</h2>
              <p className="text-muted-foreground">Manage your automated job notifications</p>
            </div>
            <button 
              onClick={() => navigate('/jobs')}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={20} />
              New Alert
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {alerts.map(alert => (
              <div key={alert.id} className={`p-6 rounded-3xl border bg-card shadow-sm hover:shadow-md transition-all space-y-4 ${!alert.isActive && 'opacity-60'}`}>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Bell size={20} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleToggleAlert(alert)}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                        alert.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {alert.isActive ? 'Active' : 'Paused'}
                    </button>
                    <button 
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors text-muted-foreground"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-lg leading-tight">
                    {alert.filters.query || alert.filters.category || 'General Alert'}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {alert.filters.country && (
                      <span className="px-2 py-1 bg-muted rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {alert.filters.country}
                      </span>
                    )}
                    {alert.filters.jobType && (
                      <span className="px-2 py-1 bg-muted rounded-lg text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {alert.filters.jobType}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-primary/5 rounded-lg text-[10px] font-bold uppercase tracking-wider text-primary">
                      {alert.frequency}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>Created {new Date(alert.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4 bg-muted/30 rounded-3xl border-2 border-dashed">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
                  <Bell size={32} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-lg">No job alerts yet</p>
                  <p className="text-sm text-muted-foreground">Create an alert on the jobs page to get notified about new opportunities.</p>
                </div>
                <button 
                  onClick={() => navigate('/jobs')}
                  className="text-primary font-bold hover:underline"
                >
                  Go to Jobs Page
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {activeTab === 'subscription' && (
        <div className="space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold">Choose Your Plan</h2>
              <p className="text-muted-foreground">
                Select the best plan for your hiring needs. Upgrade or downgrade at any time.
              </p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map(plan => {
              const price = billingCycle === 'monthly' ? plan.price : plan.yearlyPrice || Math.round(plan.price * 12 * 0.8);
              return (
                <div 
                  key={plan.id} 
                  className={`p-8 rounded-3xl border bg-card space-y-8 flex flex-col ${
                    profile?.subscriptionStatus === plan.id ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <div className="space-y-2">
                    <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${plan.color}`}>
                      {plan.name}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold">${price}</span>
                      <span className="text-muted-foreground">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                    </div>
                  </div>

                <ul className="space-y-4 flex-1">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button 
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={profile?.subscriptionStatus === plan.id}
                  className={`w-full py-4 rounded-2xl font-bold transition-all border ${
                    profile?.subscriptionStatus === plan.id
                      ? 'bg-muted text-muted-foreground cursor-not-allowed border-border'
                      : plan.id === 'pro'
                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90 shadow-lg shadow-primary/20'
                        : 'bg-muted hover:bg-muted/80 border-border'
                  }`}
                >
                  {profile?.subscriptionStatus === plan.id ? 'Current Plan' : 'Choose Plan'}
                </button>
              </div>
              );
            })}
          </div>

          <div className="p-8 rounded-3xl border bg-muted/30 space-y-6 text-center">
            <h3 className="text-xl font-bold flex items-center justify-center gap-2">
              <ShieldCheck className="text-primary" />
              Secure Payment Gateways
            </h3>
            <p className="text-sm text-muted-foreground">
              We support major payment methods for your convenience and security.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all">
              <div className="flex items-center gap-2 font-bold text-xl">
                <CreditCard /> Stripe
              </div>
              <div className="flex items-center gap-2 font-bold text-xl italic">
                <DollarSign /> PayPal
              </div>
              <div className="flex items-center gap-2 font-bold text-xl">
                <Zap /> Razorpay
              </div>
            </div>
          </div>

          {/* Billing History */}
          <div className="p-8 rounded-3xl border bg-card space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <History size={20} />
              </div>
              <h2 className="text-xl font-bold">Billing History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-muted-foreground uppercase tracking-wider border-b">
                    <th className="pb-4 px-4">Date</th>
                    <th className="pb-4 px-4">Plan</th>
                    <th className="pb-4 px-4">Amount</th>
                    <th className="pb-4 px-4">Status</th>
                    <th className="pb-4 px-4 text-right">Transaction ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map(txn => (
                    <tr key={txn.id} className="text-sm">
                      <td className="py-4 px-4">{txn.createdAt?.seconds ? new Date(txn.createdAt.seconds * 1000).toLocaleDateString() : 'Pending'}</td>
                      <td className="py-4 px-4 font-medium">{txn.planName}</td>
                      <td className="py-4 px-4">${txn.amount}</td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                          txn.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                        }`}>
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-xs text-muted-foreground">{txn.transactionId}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground italic">
                        No transactions found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl space-y-8">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold">Account Settings</h2>
            <p className="text-muted-foreground">Manage your profile and account preferences</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div className="p-8 rounded-3xl border bg-card space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <User size={20} className="text-primary" />
                  Profile Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Display Name</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={profile?.displayName || ''}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <input 
                      type="email"
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={profile?.email || ''}
                      disabled
                    />
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border text-sm text-muted-foreground">
                  Profile editing is currently handled via Google Account settings.
                </div>
              </div>

              <div className="p-8 rounded-3xl border bg-card space-y-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck size={20} className="text-primary" />
                  Security
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border">
                    <div>
                      <p className="font-bold">Email Verification</p>
                      <p className="text-sm text-muted-foreground">
                        {auth.currentUser?.emailVerified ? 'Your email is verified' : 'Your email is not verified'}
                      </p>
                    </div>
                    {auth.currentUser?.emailVerified ? (
                      <CheckCircle2 size={24} className="text-emerald-500" />
                    ) : (
                      <button 
                        onClick={() => navigate('/verify-email')}
                        className="text-sm font-bold text-primary hover:underline"
                      >
                        Verify Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="p-8 rounded-3xl border bg-card space-y-6">
                <h3 className="text-lg font-bold">Account Actions</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => auth.signOut()}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-destructive/20 text-destructive font-bold hover:bg-destructive/5 transition-all"
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </div>
              </div>

              <div className="p-8 rounded-3xl border bg-primary/5 border-primary/20 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Sparkles size={18} className="text-primary" />
                  Pro Benefits
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-primary" />
                    Priority Job Posting
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-primary" />
                    Advanced Analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-primary" />
                    Direct Messaging
                  </li>
                </ul>
                <button 
                  onClick={() => setActiveTab('subscription')}
                  className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold"
                >
                  View Plans
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Form Modal */}
      <AnimatePresence>
        {isAddingApplication && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-card rounded-3xl border shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b flex items-center justify-between bg-muted/30">
                <h2 className="text-xl font-bold">{editingApplication ? 'Edit Application' : 'Add Application'}</h2>
                <button onClick={() => setIsAddingApplication(false)} className="p-2 hover:bg-accent rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveApplication} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Job Title</label>
                    <input 
                      type="text" required
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      placeholder="e.g. Senior React Developer"
                      value={applicationForm.jobTitle}
                      onChange={e => setApplicationForm({...applicationForm, jobTitle: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Company Name</label>
                    <input 
                      type="text" required
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      placeholder="e.g. Google"
                      value={applicationForm.company}
                      onChange={e => setApplicationForm({...applicationForm, company: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select 
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={applicationForm.status}
                      onChange={e => setApplicationForm({...applicationForm, status: e.target.value as ApplicationStatus})}
                    >
                      <option value="Applied">Applied</option>
                      <option value="Interviewing">Interviewing</option>
                      <option value="Offered">Offered</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Applied</label>
                    <input 
                      type="date" required
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      value={applicationForm.appliedAt?.split('T')[0]}
                      onChange={e => setApplicationForm({...applicationForm, appliedAt: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Application URL (Optional)</label>
                    <input 
                      type="url"
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      placeholder="https://..."
                      value={applicationForm.applicationUrl}
                      onChange={e => setApplicationForm({...applicationForm, applicationUrl: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estimated Salary (Optional)</label>
                    <input 
                      type="text"
                      className="w-full px-4 py-2 rounded-lg border bg-background"
                      placeholder="e.g. $80k - $100k"
                      value={applicationForm.estimatedSalary}
                      onChange={e => setApplicationForm({...applicationForm, estimatedSalary: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Notes (Optional)</label>
                    <textarea 
                      rows={3}
                      className="w-full px-4 py-2 rounded-lg border bg-background resize-none"
                      placeholder="Add any interview dates or contact info..."
                      value={applicationForm.notes}
                      onChange={e => setApplicationForm({...applicationForm, notes: e.target.value})}
                    ></textarea>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="submit"
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {editingApplication ? 'Update' : 'Add Application'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddingApplication(false)}
                    className="px-8 py-3 rounded-xl border font-bold hover:bg-accent transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Job Form Modal */}
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
                <h2 className="text-xl font-bold">{editingJob ? 'Edit Job' : 'Post a New Job'}</h2>
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
      </AnimatePresence>
    </div>
  );
}
