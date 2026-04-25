import axios from 'axios';

// Get API base URL from environment or fallback to current origin for relative paths
const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Generic fetcher to handle errors globally and provide consistent structure
const fetcher = async (url: string, params = {}) => {
  try {
    const response = await api.get(url, { params });
    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    
    console.error(`API Error [${url}] Status: ${status}:`, errorData || error.message);
    
    // Return standard empty response structure to prevent UI crashes
    return { 
      data: [], 
      results: [], 
      jobs: [], 
      success: false, 
      error: errorData?.error || error.message,
      status 
    };
  }
};

export const apiService = {
  // Individual Job Board Proxy Routes
  fetchAdzuna: (params: any) => fetcher('/api/jobs/adzuna', params),
  fetchJSearch: (params: any) => fetcher('/api/jobs/jsearch', params),
  fetchGoogle: (params: any) => fetcher('/api/jobs/google', params),
  fetchIndeed: (params: any) => fetcher('/api/jobs/indeed', params),
  fetchLinkedIn: (params: any) => fetcher('/api/jobs/linkedin', params),
  fetchZipRecruiter: (params: any) => fetcher('/api/jobs/ziprecruiter', params),
  fetchJooble: (params: any) => fetcher('/api/jobs/jooble', params),
  fetchCareerjet: (params: any) => fetcher('/api/jobs/careerjet', params),
  
  // High-Performance Aggregated Route (Backend handles parallelization)
  fetchAllJobs: (params: any) => fetcher('/api/jobs/all', params),
  
  // Administrative & Health
  getAdminStatus: () => fetcher('/api/admin/status'),
  
  // Payments
  createCheckoutSession: (data: any) => api.post('/api/create-checkout-session', data),
};

export default apiService;
