import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SearchFilters, Job } from '../types';
import SearchFiltersComponent from '../components/SearchFilters';
import JobCard from '../components/JobCard';
import SEO from '../components/SEO';
import AdSlot from '../components/AdSlot';
import { fetchAllJobs } from '../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, AlertCircle, Bell, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function Jobs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>(
    location.state?.filters || {
      query: '',
      country: 'gb',
      category: '',
      experienceLevel: '',
      jobType: '',
    }
  );
  const [jobs, setJobs] = useState<Job[]>([]);
  const [sortBy, setSortBy] = useState<'relevance' | 'newest' | 'salary'>('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const sortedJobs = [...jobs].sort((a, b) => {
    if (sortBy === 'relevance') {
      const getScore = (job: Job) => {
        if (!filters.query) return 0;
        const q = filters.query.toLowerCase();
        let score = 0;
        if (job.title.toLowerCase().includes(q)) score += 10;
        if (job.company.toLowerCase().includes(q)) score += 5;
        if (job.description.toLowerCase().includes(q)) score += 1;
        return score;
      };
      return getScore(b) - getScore(a);
    }
    if (sortBy === 'newest') {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    }
    if (sortBy === 'salary') {
      const parseSalary = (s: string | undefined) => {
        if (!s) return 0;
        // Clean and handle 'k' notation
        const clean = s.toLowerCase().replace(/k/g, '000').replace(/[^0-9]/g, ' ');
        const nums = clean.split(/\s+/).filter(n => n.length > 0).map(Number);
        return nums.length > 0 ? Math.max(...nums) : 0;
      };
      return parseSalary(b.salary) - parseSalary(a.salary);
    }
    return 0;
  });
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState<'daily' | 'weekly'>('daily');

  const loadJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const results = await fetchAllJobs({
        query: filters.query || filters.category || 'developer',
        country: filters.country,
        page: 1,
        salaryMin: filters.salaryMin,
        salaryMax: filters.salaryMax,
        jobType: filters.jobType,
        experienceLevel: filters.experienceLevel,
      });
      setJobs(results);

      // Save search history if user is logged in
      if (user && filters.query) {
        try {
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            searchHistory: arrayUnion(filters.query)
          });
        } catch (historyError) {
          console.error('Error saving search history:', historyError);
        }
      }
    } catch (err) {
      setError('Failed to load jobs. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setIsCreatingAlert(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'alerts'), {
        filters,
        createdAt: serverTimestamp(),
        isActive: true,
        frequency: alertFrequency,
        userId: user.uid
      });
      setAlertSuccess(true);
      setTimeout(() => setAlertSuccess(false), 3000);
    } catch (error) {
      console.error('Error creating alert:', error);
    } finally {
      setIsCreatingAlert(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <SEO 
        title={filters.query ? `Jobs for ${filters.query}` : 'Browse Jobs'} 
        description={`Browse thousands of live job listings${filters.query ? ` for ${filters.query}` : ''}. Find your next career opportunity today.`}
      />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Find Your Next Opportunity</h1>
        <p className="text-muted-foreground">Browse thousands of live job listings from around the world</p>
      </div>

      <SearchFiltersComponent filters={filters} setFilters={setFilters} onSearch={loadJobs} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar / Ads */}
        <div className="hidden lg:block space-y-6">
          <div className="p-6 rounded-2xl border bg-card space-y-4 relative overflow-hidden">
            <div className="flex items-center gap-2 text-primary">
              <Bell size={20} />
              <h3 className="font-bold">Job Alerts</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Get notified about new jobs matching your current search criteria.
            </p>
            
            <div className="space-y-2 pt-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Frequency:</div>
              <div className="flex gap-2">
                {(['daily', 'weekly'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setAlertFrequency(f)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-all border ${
                      alertFrequency === f 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Current Filters:</div>
              <div className="flex flex-wrap gap-1">
                {filters.query && <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-medium">{filters.query}</span>}
                {filters.country && <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-medium uppercase">{filters.country}</span>}
                {filters.category && <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-medium">{filters.category}</span>}
              </div>
            </div>

            <button 
              onClick={handleCreateAlert}
              disabled={isCreatingAlert || alertSuccess}
              className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                alertSuccess 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'
              }`}
            >
              {isCreatingAlert ? (
                <Loader2 size={18} className="animate-spin" />
              ) : alertSuccess ? (
                <>
                  <CheckCircle2 size={18} />
                  Alert Created
                </>
              ) : (
                <>
                  <Bell size={18} />
                  Create Alert
                </>
              )}
            </button>

            <AnimatePresence>
              {alertSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[10px] text-center text-emerald-600 font-bold"
                >
                  We'll email you matching jobs!
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AdSlot slot="sidebar" className="sticky top-24" />
        </div>

        {/* Job List */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Showing <span className="text-foreground">{sortedJobs.length}</span> jobs
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sort By:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-sm border rounded-lg px-3 py-1.5 bg-background font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              >
                <option value="newest">Date Posted (Newest)</option>
                <option value="relevance">Relevance</option>
                <option value="salary">Salary (Highest)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="animate-spin text-primary" size={40} />
              <p className="text-muted-foreground font-medium">Searching global databases...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4 text-destructive">
              <AlertCircle size={40} />
              <p className="font-medium">{error}</p>
              <button onClick={loadJobs} className="text-primary hover:underline">Try Again</button>
            </div>
          ) : sortedJobs.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <p className="text-xl font-medium text-muted-foreground">No jobs found matching your criteria.</p>
              <button 
                onClick={() => setFilters({ 
                  ...filters, 
                  query: '', 
                  category: '', 
                  salaryMin: undefined, 
                  salaryMax: undefined,
                  jobType: '',
                  experienceLevel: ''
                })} 
                className="text-primary hover:underline"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <AnimatePresence mode="popLayout">
                {sortedJobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <JobCard job={job} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
