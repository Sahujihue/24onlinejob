import axios from 'axios';
import { Job } from '../types';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';

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
  try {
    const response = await axios.get('/api/jobs/adzuna', { params });
    const results = response.data.results || [];
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
  } catch (error: any) {
    const serverError = error.response?.data;
    console.error('Error fetching Adzuna jobs:', {
      message: error.message,
      details: serverError
    });
    return [];
  }
}

export async function fetchJSearchJobs(params: {
  query: string;
  page?: number;
  country?: string;
  date_posted?: string;
}): Promise<Job[]> {
  try {
    const response = await axios.get('/api/jobs/jsearch', { params });
    const results = response.data.data || [];
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
  } catch (error: any) {
    const serverError = error.response?.data;
    console.error('Error fetching JSearch jobs:', {
      message: error.message,
      details: serverError
    });
    return [];
  }
}

export async function fetchGoogleJobs(params: {
  query: string;
  location?: string;
  page?: number;
}): Promise<Job[]> {
  try {
    const response = await axios.get('/api/jobs/google', { params });
    const results = response.data.data || [];
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
  } catch (error: any) {
    console.error('Error fetching Google jobs:', error.message);
    return [];
  }
}

export async function fetchIndeedJobs(params: {
  query: string;
  location?: string;
  page?: number;
}): Promise<Job[]> {
  try {
    const response = await axios.get('/api/jobs/indeed', { params });
    const results = Array.isArray(response.data) ? response.data : (response.data.results || response.data.data || []);
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
  } catch (error: any) {
    console.error('Error fetching Indeed jobs:', error.message);
    return [];
  }
}

export async function fetchLinkedInJobs(params: {
  query: string;
  location?: string;
  page?: number;
}): Promise<Job[]> {
  try {
    const response = await axios.get('/api/jobs/linkedin', { params });
    const results = Array.isArray(response.data) ? response.data : (response.data.data || response.data.results || []);
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
  } catch (error: any) {
    console.error('Error fetching LinkedIn jobs:', error.message);
    return [];
  }
}

export async function fetchZipRecruiterJobs(params: {
  query: string;
  location?: string;
  page?: number;
}): Promise<Job[]> {
  try {
    const response = await axios.get('/api/jobs/ziprecruiter', { params });
    const results = response.data.jobs || [];
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
  } catch (error: any) {
    console.error('Error fetching ZipRecruiter jobs:', error.message);
    return [];
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
  const [adzuna, jsearch, google, indeed, linkedin, zip, manual] = await Promise.all([
    fetchAdzunaJobs({ country: params.country, what: params.query, page: params.page }),
    fetchJSearchJobs({ 
      query: params.query, 
      country: params.country || 'us', 
      page: params.page,
      date_posted: 'all'
    }),
    fetchGoogleJobs({ query: params.query, location: params.country, page: params.page }),
    fetchIndeedJobs({ query: params.query, location: params.country, page: params.page }),
    fetchLinkedInJobs({ query: params.query, location: params.country, page: params.page }),
    fetchZipRecruiterJobs({ query: params.query, location: params.country, page: params.page }),
    fetchManualJobs({ query: params.query, country: params.country })
  ]);

  let results = [...manual, ...adzuna, ...jsearch, ...google, ...indeed, ...linkedin, ...zip];

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
