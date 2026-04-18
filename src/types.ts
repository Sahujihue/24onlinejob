export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  country: string;
  category?: string;
  salary?: string;
  currency?: string;
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel?: string;
  jobType?: 'Remote' | 'On-site' | 'Hybrid';
  description: string;
  applyUrl: string;
  isFeatured?: boolean;
  isSpam?: boolean;
  authorUid?: string;
  imageUrl?: string;
  createdAt: string;
  source?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  location?: string;
  bio?: string;
  phoneNumber?: string;
  website?: string;
  role: 'user' | 'admin' | 'moderator';
  subscriptionStatus?: 'free' | 'pro' | 'premium';
  subscriptionExpiresAt?: string;
  savedJobs: string[];
  searchHistory?: string[];
  preferredKeywords?: string[];
  createdAt: string;
}

export interface AppSettings {
  adsEnabled: boolean;
  featuredCountries: string[];
}

export interface SearchFilters {
  query: string;
  country: string;
  state?: string;
  category: string;
  salaryMin?: number;
  salaryMax?: number;
  experienceLevel: string;
  jobType: string;
}

export type ApplicationStatus = 'Applied' | 'Interviewing' | 'Offered' | 'Rejected';

export interface JobApplication {
  id: string;
  userId: string;
  jobId?: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  appliedAt: string;
  notes?: string;
  applicationUrl?: string;
  estimatedSalary?: string;
}

export interface JobAlert {
  id: string;
  userId: string;
  filters: SearchFilters;
  createdAt: string;
  isActive: boolean;
  frequency: 'daily' | 'weekly';
}
