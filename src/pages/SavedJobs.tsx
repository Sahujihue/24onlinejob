import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Job } from '../types';
import JobCard from '../components/JobCard';
import { fetchAdzunaJobs } from '../lib/api';
import { Bookmark, Loader2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SavedJobs() {
  const { user, profile, loading: authLoading } = useAuth();
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !profile?.savedJobs.length) {
      setLoading(false);
      return;
    }

    const loadSaved = async () => {
      setLoading(true);
      // In a real app, we'd fetch these specific IDs from our DB or the API
      // For this demo, we'll fetch some jobs and filter them
      const jobs = await fetchAdzunaJobs({ country: 'gb', what: 'developer' });
      // Mocking saved jobs by taking some from the results
      setSavedJobs(jobs.slice(0, profile.savedJobs.length));
      setLoading(false);
    };

    loadSaved();
  }, [user, profile, authLoading]);

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground">
          <Bookmark size={40} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Sign in to see saved jobs</h1>
          <p className="text-muted-foreground">Keep track of the opportunities you're interested in.</p>
        </div>
        <Link to="/auth" className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors">
          Sign In Now
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
          <Bookmark size={24} />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Saved Jobs</h1>
          <p className="text-muted-foreground">You have {profile?.savedJobs.length || 0} jobs saved</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-muted-foreground font-medium">Loading your saved jobs...</p>
        </div>
      ) : savedJobs.length === 0 ? (
        <div className="text-center py-20 space-y-6 bg-muted/30 rounded-3xl border border-dashed">
          <div className="space-y-2">
            <h2 className="text-xl font-bold">No saved jobs yet</h2>
            <p className="text-muted-foreground">Start browsing and save jobs you're interested in.</p>
          </div>
          <Link to="/jobs" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors">
            <Search size={18} />
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
