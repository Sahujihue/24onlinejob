import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { MapPin, Building2, Calendar, ExternalLink, ArrowLeft, Bookmark, BookmarkCheck, Share2, Briefcase, CheckCircle2, Plus, History, Loader2, AlertCircle } from 'lucide-react';
import { Job } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import AdSlot from '../components/AdSlot';
import ShareModal from '../components/ShareModal';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, addDoc, collection } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';

export default function JobDetails() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [job, setJob] = useState<Job | null>(location.state?.job || null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(!job);
  
  const isSaved = profile?.savedJobs.includes(job?.id || '');

  useEffect(() => {
    if (!job && id) {
      const fetchJob = async () => {
        setLoading(true);
        try {
          const jobDoc = await getDoc(doc(db, 'jobs', id));
          if (jobDoc.exists()) {
            setJob({ id: jobDoc.id, ...jobDoc.data() } as Job);
          }
        } catch (error) {
          console.error('Error fetching job:', error);
        } finally {
          setLoading(false);
        }
      };
      fetchJob();
    }
  }, [id, job]);

  const toggleSave = async () => {
    if (!user || !job) return;
    
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      if (isSaved) {
        await updateDoc(userRef, {
          savedJobs: arrayRemove(job.id)
        });
      } else {
        await updateDoc(userRef, {
          savedJobs: arrayUnion(job.id)
        });
      }
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const trackApplication = async () => {
    if (!user || !job) return;
    
    setIsTracking(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'applications'), {
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        status: 'Applied',
        appliedAt: new Date().toISOString(),
        applicationUrl: job.applyUrl,
        estimatedSalary: job.salary || ''
      });
      alert('Application added to your tracker!');
    } catch (error) {
      console.error('Error tracking application:', error);
    } finally {
      setIsTracking(false);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return 'Recently';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Recently';
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold">Job not found</h1>
        <button onClick={() => navigate('/jobs')} className="text-primary hover:underline">Back to Jobs</button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors"
      >
        <ArrowLeft size={18} />
        Back to search
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div className="bg-card p-8 rounded-2xl border shadow-sm space-y-6">
            {job.imageUrl && (
              <div className="w-full h-64 rounded-xl overflow-hidden mb-6">
                <img src={job.imageUrl} alt={job.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {job.source}
              </span>
              {job.jobType && (
                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {job.jobType}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight">{job.title}</h1>
              <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building2 size={20} className="text-primary" />
                  <span className="font-semibold text-foreground">{job.company}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={20} className="text-primary" />
                  <span>{job.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={20} className="text-primary" />
                  <span>Posted {formatDate(job.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-6 border-t">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  const isManual = !job.source || job.source === 'Manual';
                  if (user && isManual) {
                    trackApplication();
                  }
                }}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
              >
                Apply for this job
                <ExternalLink size={20} />
              </a>
              
              {(!job.source || job.source === 'Manual') && (
                <button 
                  onClick={trackApplication}
                  disabled={isTracking || !user}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-6 py-3.5 text-base font-bold text-primary hover:bg-primary/10 transition-all"
                >
                  {isTracking ? <Loader2 className="animate-spin" size={20} /> : <History size={20} />}
                  Track Application
                </button>
              )}
              
              <button 
                onClick={toggleSave}
                disabled={isSaving || !user}
                className={`p-3.5 rounded-xl border transition-colors ${
                  isSaved ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-accent'
                } ${!user && 'opacity-50 cursor-not-allowed'}`}
                title={user ? (isSaved ? 'Remove from saved' : 'Save job') : 'Login to save jobs'}
              >
                {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
              </button>
              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="p-3.5 rounded-xl border hover:bg-accent transition-colors"
              >
                <Share2 size={20} />
              </button>
            </div>
          </div>

          <ShareModal 
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            url={window.location.href}
            title={`Check out this job: ${job.title} at ${job.company}`}
          />

          {/* Description */}
          <div className="bg-card p-8 rounded-2xl border shadow-sm space-y-6">
            <h2 className="text-2xl font-bold">Job Description</h2>
            <div 
              className="prose dark:prose-invert max-w-none text-muted-foreground leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: job.description }}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-2xl border shadow-sm space-y-6">
            <h3 className="font-bold text-lg">Job Overview</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold">
                  $
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Offered Salary</p>
                  <p className="font-semibold">{job.salary || 'Competitive'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="font-semibold">{job.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Briefcase size={20} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Job Type</p>
                  <p className="font-semibold capitalize">{job.jobType || 'Full Time'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/20 space-y-4">
            <h3 className="font-bold">Safety Tips</h3>
            <p className="text-sm text-muted-foreground">
              Never pay for a job application. Genuine employers will never ask for money during the recruitment process.
            </p>
          </div>

          {/* Ad Slot */}
          <AdSlot slot="jobDetails" />
        </div>
      </div>
    </div>
  );
}
