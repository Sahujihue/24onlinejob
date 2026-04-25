import { Job } from '../types';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import apiService from './apiService';

export async function fetchManualJobs(params: {
  query?: string;
  country?: string;
  limitCount?: number;
}): Promise<Job[]> {
  try {
    const jobsRef = collection(db, 'jobs');
    let q = query(jobsRef, orderBy('createdAt', 'desc'), limit(params.limitCount || 50));
    
    if (params.country) {
      q = query(jobsRef, where('country', '==', params.country.toLowerCase()), orderBy('createdAt', 'desc'), limit(params.limitCount || 50));
    }

    const querySnapshot = await getDocs(q);
    const jobs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString(),
    } as Job));

    if (params.query) {
      const search = params.query.toLowerCase();
      return jobs.filter(j => 
        j.title.toLowerCase().includes(search) || 
        j.company.toLowerCase().includes(search) ||
        j.description.toLowerCase().includes(search)
      );
    }

    return jobs;
  } catch (error) {
    console.error('Error fetching manual jobs:', error);
    return [];
  }
}

export async function fetchAdzunaJobs(params: {
  country?: string;
  what?: string;
  where?: string;
  page?: number;
}): Promise<Job[]> {
  const data = await apiService.fetchAdzuna(params);
  const results = data.results || [];
  return results.map((item: any) => ({
    id: `adzuna-${item.id}`,
    title: item.title,
    company: item.company.display_name,
    location: item.location.display_name,
    country: params.country || 'gb',
    description: item.description,
    applyUrl: item.redirect_url,
    createdAt: item.created,
    source: 'Adzuna',
    salary: item.salary_min ? `${item.salary_currency || '$'} ${item.salary_min} - ${item.salary_max}` : 'Not specified',
    salaryMin: item.salary_min,
    salaryMax: item.salary_max,
    currency: item.salary_currency,
  }));
}

export async function fetchJSearchJobs(params: {
  query: string;
  page?: number;
  country?: string;
  date_posted?: string;
}): Promise<Job[]> {
  const data = await apiService.fetchJSearch(params);
  const results = data.data || [];
  return results.map((item: any) => ({
    id: `jsearch-${item.job_id}`,
    title: item.job_title,
    company: item.employer_name,
    location: `${item.job_city || ''} ${item.job_country || ''}`,
    country: item.job_country,
    description: item.job_description,
    applyUrl: item.job_apply_link,
    createdAt: item.job_posted_at_datetime_utc,
    source: 'JSearch',
    jobType: item.job_employment_type,
    salary: item.job_min_salary ? `${item.job_salary_currency || '$'} ${item.job_min_salary} - ${item.job_max_salary}` : (item.job_salary_period ? `${item.job_salary_currency || '$'} ${item.job_max_salary}/${item.job_salary_period}` : 'Not specified'),
    currency: item.job_salary_currency,
  }));
}

export async function fetchGoogleJobs(params: {
  query: string;
  location?: string;
  page?: number;
}): Promise<Job[]> {
  const data = await apiService.fetchGoogle(params);
  const results = data.data || [];
  return results.map((item: any) => ({
    id: `google-${item.job_id || Math.random().toString(36).substr(2, 9)}`,
    title: item.title,
    company: item.company_name,
    location: item.location,
    country: params.location || 'Global',
    description: item.description,
    applyUrl: item.apply_link || item.job_link,
    createdAt: item.posted_at || new Date().toISOString(),
    source: 'Google Jobs',
  }));
}

export async function fetchIndeedJobs(params: {
  query: string;
  location?: string;
  page?: number;
}): Promise<Job[]> {
  const data = await apiService.fetchIndeed(params);
  const results = Array.isArray(data) ? data : (data.results || data.data || []);
  return results.map((item: any) => ({
    id: `indeed-${item.id || Math.random().toString(36).substr(2, 9)}`,
    title: item.job_title || item.title,
    company: item.company_name || item.company,
    location: item.location,
    country: params.location || 'Global',
    description: item.description,
    applyUrl: item.url || item.apply_url,
    createdAt: item.date_posted || new Date().toISOString(),
    source: 'Indeed',
    salary: item.salary || 'Not specified',
  }));
}

export async function fetchLinkedInJobs(params: {
  query: string;
  location?: string;
  page?: number;
}): Promise<Job[]> {
  const data = await apiService.fetchLinkedIn(params);
  const results = Array.isArray(data) ? data : (data.data || data.results || []);
  return results.map((item: any) => ({
    id: `linkedin-${item.id || Math.random().toString(36).substr(2, 9)}`,
    title: item.job_title || item.title,
    company: item.company_name || item.company,
    location: item.location,
    country: params.location || 'Global',
    description: item.description,
    applyUrl: item.linkedin_url || item.url,
    createdAt: item.posted_date || new Date().toISOString(),
    source: 'LinkedIn',
  }));
}

export async function fetchZipRecruiterJobs(params: {
  query: string;
  location?: string;
  page?: number;
}): Promise<Job[]> {
  const data = await apiService.fetchZipRecruiter(params);
  const results = data.jobs || [];
  return results.map((item: any) => ({
    id: `zip-${item.id || Math.random().toString(36).substr(2, 9)}`,
    title: item.name || item.title,
    company: item.hiring_company?.name || item.company,
    location: item.location,
    country: params.location || 'Global',
    description: item.snippet || item.description,
    applyUrl: item.url,
    createdAt: item.posted_time_friendly || new Date().toISOString(),
    source: 'ZipRecruiter',
  }));
}

export async function fetchJoobleJobs(params: {
  query: string;
  location?: string;
  page?: number;
}): Promise<Job[]> {
  const data = await apiService.fetchJooble(params);
  const results = data.jobs || [];
  return results.map((item: any) => ({
    id: `jooble-${item.id || Math.random().toString(36).substr(2, 9)}`,
    title: item.title,
    company: item.company,
    location: item.location,
    country: params.location || 'Global',
    description: item.snippet || item.description,
    applyUrl: item.link,
    createdAt: item.updated || new Date().toISOString(),
    source: 'Jooble',
  }));
}

export async function fetchCareerjetJobs(params: {
  query: string;
  location?: string;
  page?: number;
}): Promise<Job[]> {
  const data = await apiService.fetchCareerjet(params);
  const results = data.jobs || [];
  return results.map((item: any) => ({
    id: `careerjet-${item.url || Math.random().toString(36).substr(2, 9)}`,
    title: item.title,
    company: item.company,
    location: item.locations,
    country: params.location || 'Global',
    description: item.description,
    applyUrl: item.url,
    createdAt: item.date || new Date().toISOString(),
    source: 'Careerjet',
  }));
}

// Optimized fetching strategy using backend aggregation
export async function fetchAggregatedJobs(params: {
  query: string;
  country?: string;
  page?: number;
}): Promise<{ results: Job[], sources: string[] }> {
  try {
    const data = await apiService.fetchAllJobs(params);
    
    if (!data || !data.success) {
      console.warn('Backend aggregation returned unsuccessful response:', data?.error);
      return { results: [], sources: [] };
    }

    const rawResults = data.results || [];
    
    // Process results to normalize them for the UI
    const results = rawResults.map((item: any) => {
      // Logic from individual fetchers based on source / structure
      // Adzuna uses item.redirect_url, JSearch uses item.job_id, Google uses item.job_id or item.title
      const source = item.source || 
                    (item.job_id && item.employer_name ? 'JSearch' : 
                    (item.redirect_url ? 'Adzuna' : 
                    (item.via ? 'Google Jobs' : 'Job Board')));
      
      return {
        id: item.id || item.job_id || `job-${Math.random().toString(36).substr(2, 9)}`,
        title: item.title || item.job_title || 'Job Opportunity',
        company: item.company?.display_name || item.employer_name || item.company_name || item.company || 'Confidential',
        location: item.location?.display_name || item.location || `${item.job_city || ''} ${item.job_country || ''}`.trim() || 'Remote',
        country: item.job_country || item.location?.area?.[0] || params.country || 'Global',
        description: item.description || item.job_description || item.snippet || 'No description provided.',
        applyUrl: item.redirect_url || item.job_apply_link || item.apply_link || item.job_link || item.url || '#',
        createdAt: item.created || item.job_posted_at_datetime_utc || item.posted_at || item.date_posted || item.posted_time_friendly || new Date().toISOString(),
        source: source,
        salary: item.salary_min ? `${item.salary_currency || '$'} ${item.salary_min} - ${item.salary_max}` : (item.salary || 'Not specified'),
        salaryMin: item.salary_min || item.job_min_salary,
        salaryMax: item.salary_max || item.job_max_salary,
        jobType: item.jobType || item.job_employment_type || (item.contract_type === 'full_time' ? 'Full-time' : undefined),
      } as Job;
    });

    return {
      results: results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      sources: data.sources || []
    };
  } catch (error) {
    console.error('Error fetching aggregated jobs:', error);
    return { results: [], sources: [] };
  }
}

export async function fetchAllJobs(params: {
  query: string;
  country?: string;
  page?: number;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
  experienceLevel?: string;
}): Promise<Job[]> {
  // Use aggregated call for speed if no specific filters are applied
  const { results: externalJobs } = await fetchAggregatedJobs(params);
  const manualJobs = await fetchManualJobs({ query: params.query, country: params.country });

  let results = [...manualJobs, ...externalJobs];

  // Client-side filtering for salary
  if (params.salaryMin !== undefined) {
    results = results.filter(j => !j.salaryMin || j.salaryMin >= params.salaryMin!);
  }
  if (params.salaryMax !== undefined) {
    results = results.filter(j => !j.salaryMax || j.salaryMax <= params.salaryMax!);
  }

  // Client-side filtering for job type and experience if needed
  if (params.jobType) {
    results = results.filter(j => j.jobType?.toLowerCase().includes(params.jobType!.toLowerCase()));
  }
  if (params.experienceLevel) {
    results = results.filter(j => j.experienceLevel?.toLowerCase().includes(params.experienceLevel!.toLowerCase()));
  }

  return results.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
