import { Link } from 'react-router-dom';
import { MapPin, Building2, Calendar, ExternalLink, Bookmark, BookmarkCheck } from 'lucide-react';
import { Job } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import React, { useState } from 'react';

interface JobCardProps {
  job: Job;
  key?: React.Key;
}

export default function JobCard({ job }: JobCardProps) {
  const { user, profile } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const isSaved = profile?.savedJobs.includes(job.id);

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) return;
    
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

  return (
    <div className="group relative rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/50">
      <div className="flex justify-between items-start gap-4">
        <div className="flex gap-4 flex-1">
          {job.imageUrl ? (
            <div className="w-14 h-14 rounded-xl border overflow-hidden shrink-0 bg-white dark:bg-white/90">
              <img src={job.imageUrl} alt={job.company} className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-xl border bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
              <Building2 size={24} />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {job.source}
              </span>
              {job.isFeatured && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  Featured
                </span>
              )}
            </div>
            <h3 className="text-xl font-bold group-hover:text-primary transition-colors line-clamp-1">
              {job.title}
            </h3>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1 font-medium text-foreground">
                <span>{job.company}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                <span>{job.location}</span>
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={toggleSave}
          disabled={isSaving || !user}
          className={`p-2 rounded-full border transition-all ${
            isSaved 
              ? 'bg-primary/10 border-primary text-primary' 
              : 'hover:bg-accent border-border text-muted-foreground hover:text-foreground'
          } ${!user ? 'opacity-40 cursor-not-allowed grayscale' : 'active:scale-95'}`}
          title={!user ? 'Login to save' : (isSaved ? 'Remove from saved' : 'Save job')}
        >
          {isSaved ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
        {job.salary && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded text-xs">Salary</span>
            <span>{job.salary}</span>
          </div>
        )}
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar size={16} />
          <span>{formatDate(job.createdAt)}</span>
        </div>
      </div>

      <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
        {job.description.replace(/<[^>]*>?/gm, '')}
      </p>

      <div className="mt-6 flex items-center justify-between gap-4">
        <Link
          to={`/jobs/${job.id}`}
          state={{ job }}
          className="text-sm font-semibold text-primary hover:underline underline-offset-4"
        >
          View Details
        </Link>
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Apply Now
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  );
}
