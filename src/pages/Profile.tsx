import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { User, Mail, Camera, Save, Loader2, ShieldCheck, Zap, LogOut, Plus, X, Tag, MapPin, Phone, Globe, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, profile, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    photoURL: '',
    phoneNumber: '',
    bio: '',
    location: '',
    website: '',
    preferredKeywords: [] as string[]
  });
  const [newKeyword, setNewKeyword] = useState('');

  useEffect(() => {
    if (!authLoading && profile) {
      const handleHashScroll = () => {
        const hash = window.location.hash;
        if (hash) {
          const id = hash.replace('#', '');
          const element = document.getElementById(id);
          if (element) {
            // Small delay to ensure rendering is complete
            setTimeout(() => {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Highlight the targeted field
              element.classList.add('ring-4', 'ring-primary/30', 'ring-offset-2');
              setTimeout(() => {
                element.classList.remove('ring-4', 'ring-primary/30', 'ring-offset-2');
              }, 3000);
            }, 300);
          }
        }
      };

      handleHashScroll();
      window.addEventListener('hashchange', handleHashScroll);
      return () => window.removeEventListener('hashchange', handleHashScroll);
    }
  }, [authLoading, profile]);

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        photoURL: profile.photoURL || '',
        phoneNumber: profile.phoneNumber || '',
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        preferredKeywords: profile.preferredKeywords || []
      });
    }
  }, [profile]);

  const addKeyword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (newKeyword.trim() && !formData.preferredKeywords.includes(newKeyword.trim())) {
      setFormData({
        ...formData,
        preferredKeywords: [...formData.preferredKeywords, newKeyword.trim()]
      });
      setNewKeyword('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      preferredKeywords: formData.preferredKeywords.filter(k => k !== keyword)
    });
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...formData,
        updatedAt: new Date().toISOString()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert("Image size too large! Please use an image under 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photoURL: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateStrength = () => {
    let score = 0;
    const items = [
      { key: 'displayName', weight: 15, label: 'Full Name' },
      { key: 'photoURL', weight: 15, label: 'Profile Picture' },
      { key: 'location', weight: 15, label: 'Location' },
      { key: 'bio', weight: 20, label: 'Bio' },
      { key: 'phoneNumber', weight: 10, label: 'Phone Number' },
      { key: 'website', weight: 10, label: 'Website' },
      { key: 'preferredKeywords', weight: 15, label: 'Keywords/Skills' }
    ];

    const missing = [];
    
    for (const item of items) {
      const val = formData[item.key as keyof typeof formData];
      if (Array.isArray(val) ? val.length > 0 : !!val) {
        score += item.weight;
      } else {
        missing.push(item);
      }
    }

    return { score, missing };
  };

  const { score, missing } = calculateStrength();

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <button 
            onClick={() => logout()}
            className="flex items-center gap-2 text-destructive hover:bg-destructive/10 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar Info */}
          <div className="space-y-6">
            <div className="bg-card p-6 rounded-3xl border shadow-sm text-center space-y-4">
              <div className="relative inline-block">
                <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold border-4 border-background shadow-lg overflow-hidden">
                  {formData.photoURL ? (
                    <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    (formData.displayName || user.email || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform">
                  <Camera size={16} />
                </button>
              </div>
              <div>
                <h2 className="text-xl font-bold">{formData.displayName || 'User'}</h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                  profile?.subscriptionStatus === 'premium' ? 'bg-amber-100 text-amber-600' :
                  profile?.subscriptionStatus === 'pro' ? 'bg-blue-100 text-blue-600' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {profile?.subscriptionStatus || 'Free'} Plan
                </span>
                {profile?.role === 'admin' && (
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold uppercase">
                    Admin
                  </span>
                )}
              </div>
            </div>

            <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Profile Strength</h3>
                <span className={`text-sm font-bold ${score === 100 ? 'text-emerald-500' : 'text-primary'}`}>{score}%</span>
              </div>
              
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${score}%` }}
                  className={`h-full transition-all duration-1000 ${score === 100 ? 'bg-emerald-500' : 'bg-primary'}`}
                />
              </div>

              {missing.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">Complete these to get better recommendations:</p>
                  <div className="space-y-2">
                    {missing.slice(0, 3).map(item => (
                      <button 
                        key={item.key}
                        onClick={() => {
                          const element = document.getElementById(item.key);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            element.classList.add('ring-4', 'ring-primary/30', 'ring-offset-2');
                            setTimeout(() => {
                              element.classList.remove('ring-4', 'ring-primary/30', 'ring-offset-2');
                            }, 2000);
                          }
                        }}
                        className="w-full flex items-center gap-2 text-[11px] font-medium text-foreground p-2 rounded-lg bg-muted/30 border border-transparent hover:border-primary/20 transition-all hover:bg-muted/50"
                      >
                        <Plus size={12} className="text-primary" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                  <CheckCircle2 size={16} />
                  <span className="text-xs font-bold">Profile complete!</span>
                </div>
              )}
            </div>

            <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Account Status</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <ShieldCheck className="text-emerald-500" size={18} />
                  <span>Email Verified</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Zap className="text-amber-500" size={18} />
                  <span>Active Member</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-2">
            <div className="bg-card p-8 rounded-3xl border shadow-sm">
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <div className="relative" id="displayName">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        type="text"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={formData.displayName}
                        onChange={e => setFormData({...formData, displayName: e.target.value})}
                        placeholder="Your Name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        type="email"
                        disabled
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-muted text-muted-foreground cursor-not-allowed"
                        value={user.email || ''}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <div className="relative" id="location">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        type="text"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={formData.location}
                        onChange={e => setFormData({...formData, location: e.target.value})}
                        placeholder="City, Country"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Phone Number</label>
                    <div className="relative" id="phoneNumber">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        type="tel"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={formData.phoneNumber}
                        onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                        placeholder="+1 (234) 567-890"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Profile Picture URL</label>
                    <span className="text-[10px] text-muted-foreground">Recommended: 400 x 400 px</span>
                  </div>
                  <div className="flex gap-2" id="photoURL">
                    <div className="relative flex-1">
                      <Camera className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                      <input 
                        type="url"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        value={formData.photoURL}
                        onChange={e => setFormData({...formData, photoURL: e.target.value})}
                        placeholder="https://example.com/your-photo.jpg"
                      />
                    </div>
                    <label className="cursor-pointer bg-primary/10 text-primary px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors flex items-center gap-2 text-sm font-medium">
                      <Camera size={16} />
                      Upload
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Bio</label>
                  <textarea 
                    id="bio"
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                    value={formData.bio}
                    onChange={e => setFormData({...formData, bio: e.target.value})}
                    placeholder="Tell us about yourself..."
                  ></textarea>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Website / Portfolio</label>
                  <div className="relative" id="website">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <input 
                      type="url"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={formData.website}
                      onChange={e => setFormData({...formData, website: e.target.value})}
                      placeholder="https://yourportfolio.com"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Tag size={16} className="text-primary" />
                      Preferred Job Keywords / Skills
                    </label>
                    <span className="text-[10px] text-muted-foreground">Used for personalized recommendations</span>
                  </div>
                  
                  <div className="flex gap-2" id="preferredKeywords">
                    <input 
                      type="text"
                      className="flex-1 px-4 py-2.5 rounded-xl border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={newKeyword}
                      onChange={e => setNewKeyword(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && addKeyword(e as any)}
                      placeholder="e.g. React, Remote, Marketing..."
                    />
                    <button 
                      type="button"
                      onClick={() => addKeyword()}
                      className="bg-primary/10 text-primary px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors flex items-center gap-2 text-sm font-medium"
                    >
                      <Plus size={18} />
                      Add
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.preferredKeywords.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No keywords added yet. Add some to get better job matches.</p>
                    ) : (
                      formData.preferredKeywords.map((keyword) => (
                        <span 
                          key={keyword}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border border-primary/20 text-primary rounded-lg text-xs font-bold animate-in zoom-in-95 duration-200"
                        >
                          {keyword}
                          <button 
                            type="button"
                            onClick={() => removeKeyword(keyword)}
                            className="hover:text-destructive transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  {success && (
                    <motion.span 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-emerald-600 font-bold text-sm"
                    >
                      Profile updated!
                    </motion.span>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
