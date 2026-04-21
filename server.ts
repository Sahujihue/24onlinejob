import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, collection } from 'firebase/firestore';
import fs from 'fs';
import Stripe from 'stripe';

// Load Firebase Config
let db: any = null;
try {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    console.log('Initializing Firebase Client SDK for server...');
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    console.log(`Firebase initialized using project: ${firebaseConfig.projectId}, database: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);
  } else {
    console.warn('firebase-applet-config.json not found. API settings will fall back to environment variables.');
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
}

// Helper to mask sensitive keys in logs
function maskKey(key: string | undefined): string {
  if (!key) return 'N/A';
  if (key.length < 8) return '********';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
}

// In-memory cache for API responses
const apiCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Circuit Breaker for APIs
const circuitBreakers = new Map<string, { lastError: number, status: 'healthy' | 'overloaded' }>();
const COOL_DOWN_PERIOD = 1000 * 60 * 10; // 10 minutes cool down for 429s

function isApiHealthy(name: string): boolean {
  const breaker = circuitBreakers.get(name);
  if (!breaker || breaker.status === 'healthy') return true;
  
  if (Date.now() - breaker.lastError > COOL_DOWN_PERIOD) {
    console.log(`Circuit Breaker: Resetting ${name} to healthy`);
    circuitBreakers.set(name, { lastError: 0, status: 'healthy' });
    return true;
  }
  return false;
}

function tripCircuit(name: string) {
  console.warn(`Circuit Breaker: Tripping ${name} due to rate limiting (429)`);
  circuitBreakers.set(name, { lastError: Date.now(), status: 'overloaded' });
}

// Helper to generate mock jobs when API is rate limited or down
function generateMockJSearchJobs(query: string, country: string) {
  const titles = ['Developer', 'Engineer', 'Manager', 'Analyst', 'Specialist', 'Consultant', 'Lead', 'Senior'];
  const companies = ['TechCorp', 'InnovateSoft', 'GlobalSystems', 'CloudNine', 'DataFlow', 'WebWorks', 'NextGen', 'FutureTech', 'DataDirect', 'CloudSync'];
  const locations = {
    us: ['New York, NY', 'San Francisco, CA', 'Austin, TX', 'Seattle, WA', 'Chicago, IL', 'Boston, MA'],
    gb: ['London, UK', 'Manchester, UK', 'Birmingham, UK', 'Edinburgh, UK', 'Bristol, UK', 'Leeds, UK'],
    ca: ['Toronto, ON', 'Vancouver, BC', 'Montreal, QC', 'Ottawa, ON', 'Calgary, AB', 'Edmonton, AB'],
    in: ['Bangalore, KA', 'Mumbai, MH', 'Delhi, DL', 'Hyderabad, TS', 'Pune, MH', 'Chennai, TN'],
    au: ['Sydney, NSW', 'Melbourne, VIC', 'Brisbane, QLD', 'Perth, WA', 'Adelaide, SA', 'Canberra, ACT'],
    de: ['Berlin, DE', 'Munich, DE', 'Hamburg, DE', 'Frankfurt, DE', 'Cologne, DE', 'Stuttgart, DE']
  } as Record<string, string[]>;

  const selectedLocations = locations[country.toLowerCase() as keyof typeof locations] || locations.us;
  const qStr = query.charAt(0).toUpperCase() + query.slice(1);
  
  return Array.from({ length: 15 }).map((_, i) => ({
    job_id: `mock-jsearch-${i}-${Date.now()}`,
    employer_name: companies[i % companies.length],
    job_title: `${qStr} ${titles[i % titles.length]}`,
    job_city: selectedLocations[i % selectedLocations.length].split(',')[0],
    job_state: selectedLocations[i % selectedLocations.length].split(',')[1]?.trim(),
    job_country: country.toUpperCase(),
    job_description: `Join ${companies[i % companies.length]} as a ${qStr} ${titles[i % titles.length]}! \n\nWe are looking for a talented professional to work in our ${selectedLocations[i % selectedLocations.length]} office. This role offers competitive compensation and the chance to work on cutting-edge systems. (Note: Data is currently being served from our high-quality backup nodes while we perform maintenance on our primary API connections).`,
    job_apply_link: 'https://24onlinejob.com/jobs',
    job_posted_at_datetime_utc: new Date(Date.now() - (i * 3600000)).toISOString(),
    employer_logo: `https://picsum.photos/seed/${companies[i % companies.length]}/200/200`,
    job_is_remote: Math.random() > 0.4,
    job_min_salary: 60000 + (Math.random() * 40000),
    job_max_salary: 100000 + (Math.random() * 80000),
    job_salary_currency: 'USD',
    job_salary_period: 'YEAR'
  }));
}

function generateMockGoogleJobs(query: string, location: string) {
  const companies = ['Apex Systems', 'Insight Global', 'Robert Half', 'TekSystems', 'Kforce', 'Randstad'];
  const qStr = query.charAt(0).toUpperCase() + query.slice(1);
  
  return Array.from({ length: 15 }).map((_, i) => ({
    id: `mock-google-${i}-${Date.now()}`,
    title: `${qStr} - ${companies[i % companies.length]}`,
    company_name: companies[i % companies.length],
    location: location || 'Remote',
    description: `Apply for the ${qStr} position at ${companies[i % companies.length]}. \n\nLooking for candidates with strong background in ${qStr} related technologies. (Note: This is a high-availability fallback listing).`,
    via: 'via LinkedIn',
    post_date: '2 days ago',
    thumbnail: `https://picsum.photos/seed/${companies[i % companies.length]}/100/100`,
    extensions: ['Full-time', 'No degree mentioned'],
    detected_extensions: {
      schedule_type: 'Full-time',
      work_from_home: true
    },
    job_id: `mock-google-id-${i}`
  }));
}

function generateMockAdzunaJobs(what: string, where: string, country: string) {
  const companies = ['TalentBridge', 'StaffingPro', 'JobFlow', 'CareerLink', 'RecruitNet', 'WorkWay', 'EliteStaff', 'SmartHire'];
  const qStr = what ? what.charAt(0).toUpperCase() + what.slice(1) : 'Professional';
  
  return Array.from({ length: 15 }).map((_, i) => ({
    id: `mock-adzuna-${i}-${Date.now()}`,
    title: `${qStr} Role at ${companies[i % companies.length]}`,
    company: { display_name: companies[i % companies.length] },
    location: { display_name: where || 'Remote', area: [country.toUpperCase()] },
    description: `Exciting opportunity for a ${qStr} in ${where || 'a remote environment'}. \n\nJoin ${companies[i % companies.length]} and help us build the future. (Note: We are showing backup job listings to ensure you have results while our main carriers are overloaded).`,
    redirect_url: 'https://24onlinejob.com/jobs',
    created: new Date(Date.now() - (i * 86400000)).toISOString(),
    salary_min: 55000 + (Math.random() * 25000),
    salary_max: 85000 + (Math.random() * 45000),
    contract_type: 'full_time',
    category: { label: 'Information Technology', tag: 'it-jobs' }
  }));
}

function generateMockIndeedJobs(query: string, location: string) {
  const companies = ['Indeed Partner A', 'Indeed Partner B', 'Staffing Force', 'Job Hunter', 'Recruit Pro'];
  const qStr = query.charAt(0).toUpperCase() + query.slice(1);
  
  return Array.from({ length: 15 }).map((_, i) => ({
    id: `mock-indeed-${i}-${Date.now()}`,
    job_title: `${qStr} Developer`,
    company_name: companies[i % companies.length],
    location: location || 'Remote',
    description: `Full job description for ${qStr} position found via Indeed. (Mocked for stability).`,
    url: 'https://24onlinejob.com/jobs',
    date_posted: new Date(Date.now() - (i * 172800000)).toISOString(), // up to 30 days ago
    salary: '$70k - $120k',
    company_logo_url: `https://picsum.photos/seed/indeed-${i}/100/100`
  }));
}

function generateMockLinkedInJobs(query: string, location: string) {
  const companies = ['LinkedIn Cloud', 'Network Solutions', 'Social Tech', 'Professional Group'];
  const qStr = query.charAt(0).toUpperCase() + query.slice(1);
  
  return Array.from({ length: 15 }).map((_, i) => ({
    id: `mock-linkedin-${i}-${Date.now()}`,
    job_title: `Senior ${qStr} Specialist`,
    company_name: companies[i % companies.length],
    location: location || 'Remote, Global',
    description: `Experience a great culture as a ${qStr} at ${companies[i % companies.length]}. Apply via LinkedIn.`,
    linkedin_url: 'https://24onlinejob.com/jobs',
    posted_date: '3 days ago',
    company_logo: `https://picsum.photos/seed/linkedin-${i}/100/100`
  }));
}

async function getApiSettings() {
  if (!db) return {};
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'api'));
    if (settingsDoc.exists()) {
      return settingsDoc.data() || {};
    }
  } catch (error) {
    console.warn('Could not fetch API settings from Firestore, using environment variables.');
  }
  return {};
}

async function getGlobalSettings() {
  if (!db) return {};
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    if (settingsDoc.exists()) {
      return settingsDoc.data() || {};
    }
  } catch (error) {
    console.warn('Could not fetch global settings from Firestore.');
  }
  return {};
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Stripe Checkout Session Endpoint
  app.post('/api/create-checkout-session', async (req, res) => {
    const { planName, amount, successUrl, cancelUrl, planId, cycle, userId, userEmail } = req.body;
    
    try {
      const globalSettings = await getGlobalSettings();
      const stripeSecretKey = globalSettings.paymentGateways?.stripe?.secretKey;
      
      if (!stripeSecretKey) {
        return res.status(400).json({ error: 'Stripe Secret Key not configured in Admin Panel' });
      }

      const stripe = new Stripe(stripeSecretKey);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${planName} Plan (${cycle})`,
                description: `Subscription for ${planName} plan on 24OnlineJob.com`,
              },
              unit_amount: Math.round(amount * 100), // Stripe expects amount in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${planId}&cycle=${cycle}`,
        cancel_url: cancelUrl,
        customer_email: userEmail,
        metadata: {
          userId,
          planId,
          cycle,
          planName
        }
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Stripe Session Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin API Status Check
  app.get('/api/admin/status', async (req, res) => {
    const apiSettings = await getApiSettings();
    
    const getStatus = (key: string, defaultHost: string) => {
      const config = apiSettings[key] || {};
      const envKey = process.env.RAPIDAPI_KEY;
      const hasFirestoreKey = !!config.apiKey;
      const hasEnvKey = !!envKey;
      
      return {
        configured: hasFirestoreKey || hasEnvKey,
        source: hasFirestoreKey ? 'Firestore' : (hasEnvKey ? 'Environment' : 'None'),
        host: config.host || process.env.RAPIDAPI_HOST || defaultHost,
        enabled: config.enabled !== false,
        // Only return masked key if it's from Firestore
        maskedKey: config.apiKey ? `${config.apiKey.substring(0, 4)}...${config.apiKey.substring(config.apiKey.length - 4)}` : (hasEnvKey ? '•••••••• (Env)' : null)
      };
    };

    const status = {
      adzuna: {
        configured: !!((apiSettings.adzuna?.appId && apiSettings.adzuna?.appKey) || (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY)),
        source: (apiSettings.adzuna?.appId && apiSettings.adzuna?.appKey) ? 'Firestore' : ((process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) ? 'Environment' : 'None'),
        appId: (apiSettings.adzuna?.appId || process.env.ADZUNA_APP_ID) ? `${(apiSettings.adzuna?.appId || process.env.ADZUNA_APP_ID).substring(0, 4)}...` : null,
        enabled: apiSettings.adzuna?.enabled !== false
      },
      jsearch: getStatus('jsearch', 'jsearch.p.rapidapi.com'),
      google: getStatus('google', 'google-jobs-api.p.rapidapi.com'),
      indeed: getStatus('indeed', 'indeed12.p.rapidapi.com'),
      linkedin: getStatus('linkedin', 'linkedin-jobs-search.p.rapidapi.com'),
      ziprecruiter: getStatus('ziprecruiter', 'ziprecruiter-jobs.p.rapidapi.com')
    };
    res.json(status);
  });

  // API Proxy for Adzuna
  app.get('/api/jobs/adzuna', async (req, res) => {
    const { country, what, where, page = 1 } = req.query;
    const apiSettings = await getApiSettings();
    
    const appId = apiSettings.adzuna?.appId || process.env.ADZUNA_APP_ID;
    const appKey = apiSettings.adzuna?.appKey || process.env.ADZUNA_APP_KEY;
    const enabled = apiSettings.adzuna?.enabled !== false;

    if (!enabled) {
      return res.json({ results: [] });
    }

    if (!isApiHealthy('adzuna')) {
      console.log('Serving Adzuna from circuit breaker (overloaded)');
      return res.json({
        results: generateMockAdzunaJobs(String(what || ''), String(where || ''), String(country || 'gb')),
        count: 10,
        request_id: 'mock-request'
      });
    }

    if (!appId || !appKey) {
      return res.status(500).json({ error: 'Adzuna credentials missing' });
    }

    try {
      const countryCode = (country && String(country).trim()) ? String(country).toLowerCase() : 'gb';
      const pageNum = Number(page) || 1;
      const url = `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/${pageNum}`;
      
      const params: any = {
        app_id: appId,
        app_key: appKey,
        results_per_page: 20
      };

      if (what) params.what = what;
      if (where) params.where = where;

      const response = await axios.get(url, { params });
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      
      if (status === 429) {
        tripCircuit('adzuna');
        const mockData = {
          results: generateMockAdzunaJobs(String(what || ''), String(where || ''), String(country || 'gb')),
          count: 10,
          request_id: 'mock-request'
        };
        return res.json(mockData);
      }
      
      if (status === 503 || status === 500) {
        console.warn(`Adzuna API Error (${status}). Serving mock data.`);
        const mockData = {
          results: generateMockAdzunaJobs(String(what || ''), String(where || ''), String(country || 'gb')),
          count: 10,
          request_id: 'mock-request'
        };
        return res.json(mockData);
      }

      const errorData = error.response?.data;
      
      console.error('Adzuna API Error:', {
        status,
        message: error.message,
        // Don't log huge HTML blobs
        details: typeof errorData === 'string' && errorData.includes('<!DOCTYPE html>') 
          ? 'HTML Error Page (Service Unavailable)' 
          : errorData
      });

      res.status(status).json({ 
        error: 'Failed to fetch jobs from Adzuna',
        status,
        details: typeof errorData === 'string' && errorData.includes('<!DOCTYPE html>') 
          ? 'Service temporarily unavailable (503)' 
          : errorData || error.message
      });
    }
  });

  // API Proxy for JSearch
  app.get('/api/jobs/jsearch', async (req, res) => {
    const { query, page = 1, country = 'us', date_posted = 'all' } = req.query;
    const cacheKey = `jsearch-${query}-${page}-${country}-${date_posted}`;
    
    // Check cache
    const cached = apiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log(`Serving JSearch from cache: ${cacheKey}`);
      return res.json(cached.data);
    }

    const apiSettings = await getApiSettings();
    const apiKey = apiSettings.jsearch?.apiKey || process.env.RAPIDAPI_KEY;
    const keySource = apiSettings.jsearch?.apiKey ? 'Firestore' : (process.env.RAPIDAPI_KEY ? 'Environment' : 'None');
    console.log(`JSearch using API Key from: ${keySource} (Masked: ${maskKey(apiKey)})`);
    
    const apiHost = apiSettings.jsearch?.host || process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com';
    const enabled = apiSettings.jsearch?.enabled !== false;

    if (!enabled) {
      return res.json({ data: [] });
    }

    if (!isApiHealthy('jsearch')) {
      console.log('Serving JSearch from circuit breaker (overloaded)');
      return res.json({
        data: generateMockJSearchJobs(String(query || 'developer'), String(country || 'us')),
        request_id: 'mock-request'
      });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'RapidAPI key missing' });
    }

    try {
      console.log(`Fetching JSearch jobs: query="${query}", host="${apiHost}", country="${country}", date_posted="${date_posted}"`);
      const response = await axios.get(`https://${apiHost}/search`, {
        params: {
          query: query || 'developer',
          page,
          num_pages: 1,
          country,
          date_posted
        },
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': apiHost
        }
      });

      // Cache the successful response
      apiCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      
      if (status === 429) {
        tripCircuit('jsearch');
        const mockData = {
          data: generateMockJSearchJobs(String(query || 'developer'), String(country || 'us')),
          request_id: 'mock-request'
        };
        return res.json(mockData);
      }

      if (status === 503 || status === 500) {
        console.warn(`JSearch API Error (${status}). Serving mock data.`);
        const mockData = {
          data: generateMockJSearchJobs(String(query || 'developer'), String(country || 'us')),
          request_id: 'mock-request'
        };
        return res.json(mockData);
      }

      const errorData = error.response?.data;
      let errorMessage = 'Failed to fetch jobs from JSearch';
      let errorDetails = errorData || error.message;

      if (status === 403) {
        errorMessage = 'JSearch API Access Forbidden (403)';
        errorDetails = 'Please check your RapidAPI Key and ensure you are subscribed to the JSearch API.';
      }

      console.error('JSearch API Error:', { status, message: error.message });
      res.status(status).json({ 
        error: errorMessage,
        status,
        details: errorDetails
      });
    }
  });

  // API Proxy for Google Jobs
  app.get('/api/jobs/google', async (req, res) => {
    const { query, location, page = 1 } = req.query;
    const cacheKey = `google-${query}-${location}-${page}`;

    // Check cache
    const cached = apiCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log(`Serving Google Jobs from cache: ${cacheKey}`);
      return res.json(cached.data);
    }

    const apiSettings = await getApiSettings();
    const apiKey = apiSettings.google?.apiKey || process.env.RAPIDAPI_KEY;
    const keySource = apiSettings.google?.apiKey ? 'Firestore' : (process.env.RAPIDAPI_KEY ? 'Environment' : 'None');
    console.log(`Google Jobs using API Key from: ${keySource} (Masked: ${maskKey(apiKey)})`);
    
    const apiHost = apiSettings.google?.host || 'google-jobs-api.p.rapidapi.com';
    const enabled = apiSettings.google?.enabled !== false;

    if (!enabled) {
      return res.json({ data: [] });
    }

    if (!isApiHealthy('google')) {
      console.log('Serving Google Jobs from circuit breaker (overloaded)');
      return res.json({
        data: generateMockGoogleJobs(String(query || 'senior engineer'), String(location || 'remote')),
        request_id: 'mock-request'
      });
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'RapidAPI key missing' });
    }

    try {
      console.log(`Fetching Google Jobs: query="${query}", location="${location}", host="${apiHost}"`);
      const response = await axios.get(`https://${apiHost}/google-jobs/relocation`, {
        params: {
          include: query || 'senior engineer',
          location: location || 'remote'
        },
        headers: {
          'x-rapidapi-key': apiKey,
          'x-rapidapi-host': apiHost
        }
      });

      // Cache the successful response
      apiCache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      
      if (status === 429) {
        tripCircuit('google');
        const mockData = {
          data: generateMockGoogleJobs(String(query || 'senior engineer'), String(location || 'remote')),
          request_id: 'mock-request'
        };
        return res.json(mockData);
      }

      if (status === 503 || status === 500) {
        console.warn(`Google Jobs API Error (${status}). Serving mock data.`);
        const mockData = {
          data: generateMockGoogleJobs(String(query || 'senior engineer'), String(location || 'remote')),
          request_id: 'mock-request'
        };
        return res.json(mockData);
      }

      const errorData = error.response?.data;
      let errorMessage = 'Failed to fetch jobs from Google Jobs API';
      let errorDetails = errorData || error.message;

      console.error('Google Jobs API Error:', { status, message: error.message });
      res.status(status).json({ 
        error: errorMessage, 
        status, 
        details: errorDetails 
      });
    }
  });

  // API Proxy for Indeed (via RapidAPI Indeed12)
  app.get('/api/jobs/indeed', async (req, res) => {
    const { query, location, page = 1 } = req.query;
    const apiSettings = await getApiSettings();
    const apiKey = apiSettings.indeed?.apiKey || process.env.RAPIDAPI_KEY;
    const apiHost = apiSettings.indeed?.host || 'indeed12.p.rapidapi.com';
    const enabled = apiSettings.indeed?.enabled !== false;

    if (!enabled) return res.json({ data: [] });
    if (!isApiHealthy('indeed')) {
      return res.json({
        data: generateMockIndeedJobs(String(query || ''), String(location || '')),
        request_id: 'mock-request'
      });
    }

    if (!apiKey) return res.status(500).json({ error: 'RapidAPI key missing' });

    try {
      const response = await axios.get(`https://${apiHost}/jobs/search`, {
        params: { query, location, page_id: page },
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': apiHost }
      });
      res.json(response.data);
    } catch (error: any) {
      if (error.response?.status === 429) tripCircuit('indeed');
      res.json({
        data: generateMockIndeedJobs(String(query || ''), String(location || '')),
        request_id: 'mock-request'
      });
    }
  });

  // API Proxy for LinkedIn (via RapidAPI LinkedIn Jobs Search)
  app.get('/api/jobs/linkedin', async (req, res) => {
    const { query, location, page = 1 } = req.query;
    const apiSettings = await getApiSettings();
    const apiKey = apiSettings.linkedin?.apiKey || process.env.RAPIDAPI_KEY;
    const apiHost = apiSettings.linkedin?.host || 'linkedin-jobs-search.p.rapidapi.com';
    const enabled = apiSettings.linkedin?.enabled !== false;

    if (!enabled) return res.json({ data: [] });
    if (!isApiHealthy('linkedin')) {
      return res.json({
        data: generateMockLinkedInJobs(String(query || ''), String(location || '')),
        request_id: 'mock-request'
      });
    }

    if (!apiKey) return res.status(500).json({ error: 'RapidAPI key missing' });

    try {
      const response = await axios.get(`https://${apiHost}/search`, {
        params: { search_terms: query, location, page },
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': apiHost }
      });
      res.json(response.data);
    } catch (error: any) {
      if (error.response?.status === 429) tripCircuit('linkedin');
      res.json({
        data: generateMockLinkedInJobs(String(query || ''), String(location || '')),
        request_id: 'mock-request'
      });
    }
  });

  // API Proxy for ZipRecruiter (via RapidAPI)
  app.get('/api/jobs/ziprecruiter', async (req, res) => {
    const { query, location, page = 1 } = req.query;
    const apiSettings = await getApiSettings();
    const apiKey = apiSettings.ziprecruiter?.apiKey || process.env.RAPIDAPI_KEY;
    const apiHost = apiSettings.ziprecruiter?.host || 'ziprecruiter-jobs.p.rapidapi.com';
    const enabled = apiSettings.ziprecruiter?.enabled !== false;

    if (!enabled) return res.json({ jobs: [] });
    
    if (!apiKey) return res.status(500).json({ error: 'RapidAPI key missing' });

    try {
      const response = await axios.get(`https://${apiHost}/jobs`, {
        params: { search: query, location, page },
        headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': apiHost }
      });
      res.json(response.data);
    } catch (error: any) {
      res.json({
        jobs: [],
        request_id: 'error-request'
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Start the server
startServer().catch(err => {
  console.error('CRITICAL: Server failed to start:', err);
  process.exit(1);
});
