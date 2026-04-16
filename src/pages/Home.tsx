import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Globe, Briefcase, Users, Zap, DollarSign, BarChart3, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import SearchFiltersComponent from '../components/SearchFilters';
import { SearchFilters, Job } from '../types';
import JobCard from '../components/JobCard';
import SEO from '../components/SEO';
import { fetchAdzunaJobs, fetchAllJobs } from '../lib/api';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    country: 'gb',
    category: '',
    experienceLevel: '',
    jobType: '',
  });
  const [trendingJobs, setTrendingJobs] = useState<Job[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    const loadTrending = async () => {
      const jobs = await fetchAdzunaJobs({ country: 'gb', what: 'developer' });
      setTrendingJobs(jobs.slice(0, 6));
      setLoading(false);
    };
    loadTrending();
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    
    const loadRecs = async () => {
      setLoadingRecs(true);
      try {
        const keywords = profile.preferredKeywords?.length 
          ? profile.preferredKeywords 
          : (profile.searchHistory?.slice(-3) || []);
        
        if (keywords.length > 0) {
          const results = await fetchAllJobs({
            query: keywords.join(' '),
            country: profile.featuredCountries?.[0] || 'gb',
            page: 1
          });
          setRecommendedJobs(results.slice(0, 3));
        }
      } catch (err) {
        console.error('Error loading recommendations:', err);
      } finally {
        setLoadingRecs(false);
      }
    };
    loadRecs();
  }, [user, profile]);

  const handleSearch = () => {
    navigate('/jobs', { state: { filters } });
  };

  const featuredCountries = [
    { 
      name: 'United Kingdom', 
      code: 'gb', 
      jobs: '150k+', 
      avgSalary: '£35k - £65k', 
      industries: ['FinTech', 'Healthcare', 'Tech'] 
    },
    { 
      name: 'United States', 
      code: 'us', 
      jobs: '500k+', 
      avgSalary: '$60k - $120k', 
      industries: ['Software', 'Finance', 'Engineering'] 
    },
    { 
      name: 'Canada', 
      code: 'ca', 
      jobs: '80k+', 
      avgSalary: 'C$55k - C$95k', 
      industries: ['Tech', 'Natural Resources', 'Services'] 
    },
    { 
      name: 'Germany', 
      code: 'de', 
      jobs: '120k+', 
      avgSalary: '€45k - €85k', 
      industries: ['Automotive', 'Manufacturing', 'Tech'] 
    },
    { 
      name: 'India', 
      code: 'in', 
      jobs: '200k+', 
      avgSalary: '₹8L - ₹25L', 
      industries: ['IT Services', 'E-commerce', 'FinTech'] 
    },
    { 
      name: 'Australia', 
      code: 'au', 
      jobs: '60k+', 
      avgSalary: 'A$70k - A$130k', 
      industries: ['Mining', 'Healthcare', 'Tech'] 
    },
  ];

  return (
    <div className="space-y-20 pb-20">
      <SEO 
        title="Home" 
        description="Search millions of jobs globally with our advanced job search engine. Find opportunities in the UK, USA, Canada, India, and more."
      />
      {/* Hero Section */}
      <section className="relative min-h-[600px] flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="absolute inset-0 z-0 opacity-20 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 bg-primary rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-primary/40 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>

        <div className="container mx-auto px-4 z-10 text-center space-y-8">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight"
          >
            Find Your Dream Job <br />
            <span className="text-primary">Anywhere in the World</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            The world's most comprehensive job search engine. Access millions of live job listings from top companies globally.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <SearchFiltersComponent filters={filters} setFilters={setFilters} onSearch={handleSearch} />
          </motion.div>

          <div className="flex flex-wrap items-center justify-center gap-8 pt-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2"><Briefcase size={18} /> 2M+ Live Jobs</div>
            <div className="flex items-center gap-2"><Globe size={18} /> 50+ Countries</div>
            <div className="flex items-center gap-2"><Users size={18} /> 10k+ Companies</div>
          </div>
        </div>
      </section>

      {/* Personalized Recommendations */}
      {user && (recommendedJobs.length > 0 || loadingRecs) && (
        <section className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Sparkles className="text-amber-500" />
              <h2 className="text-3xl font-bold">Recommended for You</h2>
            </div>
            <button onClick={() => navigate('/dashboard')} className="text-primary font-semibold hover:underline">Refine matches</button>
          </div>

          {loadingRecs ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="animate-spin text-primary" size={32} />
              <p className="text-muted-foreground">Tailoring your job feed...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trending Jobs */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-primary" />
            <h2 className="text-3xl font-bold">Trending Jobs</h2>
          </div>
          <button onClick={() => navigate('/jobs')} className="text-primary font-semibold hover:underline">View all</button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-xl border bg-muted animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      {/* Featured Countries */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 space-y-4">
            <h2 className="text-3xl font-bold">Explore Global Opportunities</h2>
            <p className="text-muted-foreground">Find jobs in the world's most active job markets</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCountries.map((country) => (
              <button
                key={country.code}
                onClick={() => navigate('/jobs', { state: { filters: { ...filters, country: country.code } } })}
                className="group p-8 rounded-3xl border bg-card hover:border-primary hover:shadow-xl transition-all text-left space-y-6 relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="text-4xl">
                      {country.code === 'us' && '🇺🇸'}
                      {country.code === 'gb' && '🇬🇧'}
                      {country.code === 'ca' && '🇨🇦'}
                      {country.code === 'de' && '🇩🇪'}
                      {country.code === 'in' && '🇮🇳'}
                      {country.code === 'au' && '🇦🇺'}
                    </div>
                    <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">{country.name}</h3>
                    <p className="text-sm font-medium text-primary">{country.jobs} live jobs</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <Zap size={24} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <DollarSign size={14} className="text-primary" />
                      Avg. Salary
                    </div>
                    <p className="text-sm font-semibold">{country.avgSalary}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      <BarChart3 size={14} className="text-primary" />
                      Demand
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {country.industries.slice(0, 2).map(ind => (
                        <span key={ind} className="text-[10px] bg-muted px-1.5 py-0.5 rounded-md">{ind}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-1 text-xs font-bold text-primary">
                    Explore Jobs <Zap size={12} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <Zap size={32} />
            </div>
            <h3 className="text-xl font-bold">Real-time Data</h3>
            <p className="text-muted-foreground">We fetch live jobs directly from top sources to ensure you never miss an opportunity.</p>
          </div>
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <Globe size={32} />
            </div>
            <h3 className="text-xl font-bold">Global Reach</h3>
            <p className="text-muted-foreground">Search jobs across 50+ countries with localized filters and salary data.</p>
          </div>
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-bold">Personalized</h3>
            <p className="text-muted-foreground">Save jobs, set alerts, and get recommendations based on your profile.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
