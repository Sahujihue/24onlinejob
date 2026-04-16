import { useState } from 'react';
import { Search, MapPin, Briefcase, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { SearchFilters } from '../types';
import SearchableSelect from './SearchableSelect';
import { motion, AnimatePresence } from 'framer-motion';

interface FiltersProps {
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  onSearch: () => void;
}

export default function SearchFiltersComponent({ filters, setFilters, onSearch }: FiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const countries = [
    { code: 'us', name: 'United States' },
    { code: 'gb', name: 'United Kingdom' },
    { code: 'ca', name: 'Canada' },
    { code: 'au', name: 'Australia' },
    { code: 'in', name: 'India' },
    { code: 'de', name: 'Germany' },
    { code: 'fr', name: 'France' },
    { code: 'br', name: 'Brazil' },
    { code: 'at', name: 'Austria' },
    { code: 'be', name: 'Belgium' },
    { code: 'ch', name: 'Switzerland' },
    { code: 'it', name: 'Italy' },
    { code: 'nl', name: 'Netherlands' },
    { code: 'pl', name: 'Poland' },
    { code: 'ru', name: 'Russia' },
    { code: 'sg', name: 'Singapore' },
    { code: 'za', name: 'South Africa' },
    { code: 'ae', name: 'United Arab Emirates' },
    { code: 'sa', name: 'Saudi Arabia' },
    { code: 'jp', name: 'Japan' },
    { code: 'kr', name: 'South Korea' },
    { code: 'cn', name: 'China' },
    { code: 'mx', name: 'Mexico' },
    { code: 'es', name: 'Spain' },
    { code: 'pt', name: 'Portugal' },
    { code: 'se', name: 'Sweden' },
    { code: 'no', name: 'Norway' },
    { code: 'dk', name: 'Denmark' },
    { code: 'fi', name: 'Finland' },
    { code: 'ie', name: 'Ireland' },
    { code: 'nz', name: 'New Zealand' },
    { code: 'my', name: 'Malaysia' },
    { code: 'th', name: 'Thailand' },
    { code: 'id', name: 'Indonesia' },
    { code: 'ph', name: 'Philippines' },
    { code: 'vn', name: 'Vietnam' },
    { code: 'tr', name: 'Turkey' },
    { code: 'eg', name: 'Egypt' },
    { code: 'ng', name: 'Nigeria' },
    { code: 'ke', name: 'Kenya' },
    { code: 'ar', name: 'Argentina' },
    { code: 'cl', name: 'Chile' },
    { code: 'co', name: 'Colombia' },
    { code: 'pe', name: 'Peru' },
    { code: 'pk', name: 'Pakistan' },
    { code: 'bd', name: 'Bangladesh' },
    { code: 'il', name: 'Israel' },
    { code: 'gr', name: 'Greece' },
    { code: 'cz', name: 'Czech Republic' },
    { code: 'hu', name: 'Hungary' },
    { code: 'ro', name: 'Romania' },
    { code: 'ua', name: 'Ukraine' },
  ];

  const countryStates: Record<string, string[]> = {
    'us': ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'],
    'in': ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'],
    'ca': ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan'],
    'au': ['New South Wales', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia'],
    'gb': ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  };

  const categories = [
    'All Categories',
    'Software Engineering',
    'Data Science',
    'Marketing',
    'Design',
    'Sales',
    'Customer Support',
    'Finance',
    'Human Resources',
    'Education',
    'Healthcare',
  ];

  const jobTypes = [
    { value: '', label: 'Work Mode' },
    { value: 'Remote', label: 'Remote' },
    { value: 'On-site', label: 'On-site' },
    { value: 'Hybrid', label: 'Hybrid' },
  ];

  const experienceLevels = [
    { value: '', label: 'Experience' },
    { value: 'entry', label: 'Entry' },
    { value: 'mid', label: 'Mid' },
    { value: 'senior', label: 'Senior' },
  ];

  return (
    <div className="w-full space-y-4 bg-card p-6 rounded-2xl border shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            type="text"
            placeholder="Job title, keywords, or company"
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            value={filters.query}
            onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          />
        </div>

        <SearchableSelect
          options={countries.map(c => ({ value: c.code, label: c.name }))}
          value={filters.country}
          onChange={(val) => setFilters({ ...filters, country: val, state: '' })}
          placeholder="Select Country"
          icon={<MapPin size={18} />}
        />

        {filters.country && countryStates[filters.country] && (
          <SearchableSelect
            options={countryStates[filters.country].map(s => ({ value: s, label: s }))}
            value={filters.state || ''}
            onChange={(val) => setFilters({ ...filters, state: val })}
            placeholder="Select State"
            icon={<MapPin size={18} />}
          />
        )}

        <SearchableSelect
          options={categories.map(c => ({ value: c === 'All Categories' ? '' : c, label: c }))}
          value={filters.category}
          onChange={(val) => setFilters({ ...filters, category: val })}
          placeholder="Select Category"
          icon={<Briefcase size={18} />}
        />

        <div className="flex gap-2">
          <button
            onClick={onSearch}
            className="flex-1 bg-primary text-primary-foreground rounded-lg px-6 py-2.5 font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <Search size={18} />
            Search
          </button>
          <button
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`p-2.5 rounded-lg border transition-all ${isAdvancedOpen ? 'bg-primary/10 border-primary text-primary' : 'hover:bg-muted'}`}
            title="Advanced Filters"
          >
            <Filter size={20} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdvancedOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ 
              height: 'auto', 
              opacity: 1,
            }}
            exit={{ height: 0, opacity: 0 }}
            onAnimationComplete={() => {
              if (isAdvancedOpen) {
                const el = document.getElementById('advanced-filters-container');
                if (el) el.style.overflow = 'visible';
              }
            }}
            onAnimationStart={() => {
              const el = document.getElementById('advanced-filters-container');
              if (el) el.style.overflow = 'hidden';
            }}
            id="advanced-filters-container"
            className="overflow-visible"
          >
            <div className="flex flex-wrap items-center gap-6 pt-6 border-t">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Work Mode</label>
                <SearchableSelect
                  className="w-48"
                  options={jobTypes}
                  value={filters.jobType}
                  onChange={(val) => setFilters({ ...filters, jobType: val })}
                  placeholder="Work Mode"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Experience</label>
                <SearchableSelect
                  className="w-48"
                  options={experienceLevels}
                  value={filters.experienceLevel}
                  onChange={(val) => setFilters({ ...filters, experienceLevel: val })}
                  placeholder="Experience"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Salary Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-28 text-sm border rounded-lg px-3 py-2.5 bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={filters.salaryMin || ''}
                    onChange={(e) => setFilters({ ...filters, salaryMin: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <span className="text-muted-foreground">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-28 text-sm border rounded-lg px-3 py-2.5 bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    value={filters.salaryMax || ''}
                    onChange={(e) => setFilters({ ...filters, salaryMax: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
