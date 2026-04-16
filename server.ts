import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };
import Stripe from 'stripe';

dotenv.config();

// Initialize Firebase for server-side use
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// In-memory cache for API responses
const apiCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

// Helper to generate mock jobs when API is rate limited
function generateMockJSearchJobs(query: string, country: string) {
  const titles = ['Software Engineer', 'Product Manager', 'Data Scientist', 'UX Designer', 'DevOps Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer'];
  const companies = ['TechCorp', 'InnovateSoft', 'GlobalSystems', 'CloudNine', 'DataFlow', 'WebWorks', 'NextGen', 'FutureTech'];
  const locations = {
    us: ['New York, NY', 'San Francisco, CA', 'Austin, TX', 'Seattle, WA', 'Chicago, IL'],
    gb: ['London, UK', 'Manchester, UK', 'Birmingham, UK', 'Edinburgh, UK', 'Bristol, UK'],
    ca: ['Toronto, ON', 'Vancouver, BC', 'Montreal, QC', 'Ottawa, ON', 'Calgary, AB'],
    in: ['Bangalore, KA', 'Mumbai, MH', 'Delhi, DL', 'Hyderabad, TS', 'Pune, MH'],
    au: ['Sydney, NSW', 'Melbourne, VIC', 'Brisbane, QLD', 'Perth, WA', 'Adelaide, SA'],
    de: ['Berlin, DE', 'Munich, DE', 'Hamburg, DE', 'Frankfurt, DE', 'Cologne, DE']
  };

  const selectedLocations = locations[country as keyof typeof locations] || locations.us;
  
  return Array.from({ length: 10 }).map((_, i) => ({
    job_id: `mock-jsearch-${i}-${Date.now()}`,
    employer_name: companies[i % companies.length],
    job_title: `${query.charAt(0).toUpperCase() + query.slice(1)} ${titles[i % titles.length]}`,
    job_city: selectedLocations[i % selectedLocations.length].split(',')[0],
    job_state: selectedLocations[i % selectedLocations.length].split(',')[1]?.trim(),
    job_country: country.toUpperCase(),
    job_description: `This is a high-quality mock job listing for a ${query} position at ${companies[i % companies.length]}. We are looking for talented individuals to join our team in ${selectedLocations[i % selectedLocations.length]}. (API Rate Limited - Serving Local Data)`,
    job_apply_link: 'https://24onlinejob.com/jobs',
    job_posted_at_datetime_utc: new Date().toISOString(),
    employer_logo: `https://picsum.photos/seed/${companies[i % companies.length]}/200/200`,
    job_is_remote: Math.random() > 0.5,
    job_min_salary: 50000 + (Math.random() * 50000),
    job_max_salary: 100000 + (Math.random() * 50000),
    job_salary_currency: 'USD',
    job_salary_period: 'YEAR'
  }));
}

function generateMockGoogleJobs(query: string, location: string) {
  const companies = ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Netflix', 'Uber', 'Airbnb'];
  
  return Array.from({ length: 10 }).map((_, i) => ({
    id: `mock-google-${i}-${Date.now()}`,
    title: `${query.charAt(0).toUpperCase() + query.slice(1)} Specialist`,
    company_name: companies[i % companies.length],
    location: location || 'Remote',
    description: `Exciting opportunity for a ${query} professional at ${companies[i % companies.length]}. Join our global team and work on cutting-edge technologies. (API Rate Limited - Serving Local Data)`,
    extensions: ['Full-time', 'Work from home'],
    detected_extensions: {
      schedule_type: 'Full-time',
      work_from_home: true
    },
    thumbnail: `https://picsum.photos/seed/${companies[i % companies.length]}/100/100`,
    via: 'via 24OnlineJob.com',
    job_id: `mock-google-id-${i}`
  }));
}

function generateMockAdzunaJobs(what: string, where: string, country: string) {
  const companies = ['AdzunaTech', 'JobFinder', 'CareerBoost', 'WorkForce', 'TalentHub'];
  const categories = ['IT Jobs', 'Sales Jobs', 'Engineering Jobs', 'Healthcare Jobs', 'Finance Jobs'];
  
  return Array.from({ length: 10 }).map((_, i) => ({
    id: `mock-adzuna-${i}-${Date.now()}`,
    title: `${what || 'Professional'} ${categories[i % categories.length]}`,
    company: { display_name: companies[i % companies.length] },
    location: { display_name: where || 'Remote', area: [country.toUpperCase(), where || 'Remote'] },
    description: `A fantastic opportunity for a ${what || 'talented'} individual. Join ${companies[i % companies.length]} and take your career to the next level in ${where || 'your area'}. (API Rate Limited - Serving Local Data)`,
    redirect_url: 'https://24onlinejob.com/jobs',
    created: new Date().toISOString(),
    salary_min: 40000 + (Math.random() * 20000),
    salary_max: 70000 + (Math.random() * 30000),
    contract_type: 'full_time',
    category: { label: categories[i % categories.length], tag: 'it-jobs' }
  }));
}

async function getApiSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'api'));
    if (settingsDoc.exists()) {
      return settingsDoc.data() || {};
    }
  } catch (error) {
    console.error('Error fetching API settings from Firestore:', error);
  }
  return {};
}

async function getGlobalSettings() {
  try {
    const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
    if (settingsDoc.exists()) {
      return settingsDoc.data() || {};
    }
  } catch (error) {
    console.error('Error fetching global settings from Firestore:', error);
  }
  return {};
}

async function startServer() {
  const app = express();
  const PORT = 3000;

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
      google: getStatus('google', 'google-jobs-api.p.rapidapi.com')
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
        console.warn('Adzuna API Rate Limited (429). Serving mock data.');
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
    const apiHost = apiSettings.jsearch?.host || process.env.RAPIDAPI_HOST || 'jsearch.p.rapidapi.com';
    const enabled = apiSettings.jsearch?.enabled !== false;

    if (!enabled) {
      return res.json({ data: [] });
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
        console.warn('JSearch API Rate Limited (429). Serving mock data.');
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
    const apiHost = apiSettings.google?.host || 'google-jobs-api.p.rapidapi.com';
    const enabled = apiSettings.google?.enabled !== false;

    if (!enabled) {
      return res.json({ data: [] });
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
        console.warn('Google Jobs API Rate Limited (429). Serving mock data.');
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

startServer();
