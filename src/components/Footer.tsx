import { Link } from 'react-router-dom';
import { Facebook, Linkedin, Github, Mail, Phone, MapPin, Instagram } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import AdSlot from './AdSlot';

const XIcon = ({ size = 18 }: { size?: number }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor"
  >
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932L18.901 1.153zM17.61 20.644h2.039L6.486 3.24H4.298L17.61 20.644z" />
  </svg>
);

export default function Footer() {
  const { settings } = useSettings();
  const { user } = useAuth();

  // Ensure Legal section exists even if not in Firestore yet
  const footerSections = [...settings.footerSections];
  const hasLegal = footerSections.some(s => s.title.toLowerCase() === 'legal');
  
  if (!hasLegal) {
    footerSections.push({
      title: 'Legal',
      links: [
        { label: 'Disclaimer', href: '/disclaimer' },
        { label: 'Shipping Policy', href: '/shipping-policy' },
        { label: 'Refund Policy', href: '/refund-policy' }
      ]
    });
  }

  return (
    <footer className="bg-[#0f172a] text-slate-300 border-t border-slate-800">
      <div className="container mx-auto px-4 pt-12">
        <AdSlot slot="footer" />
      </div>
      
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-4 space-y-6">
            <Link to="/" className="flex items-center gap-2">
              {settings.siteLogo ? (
                <img src={settings.siteLogo} alt={settings.siteName} className="h-10 w-auto brightness-0 invert" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-2xl font-black tracking-tighter text-white">
                  {settings.siteName.split('.')[0]}<span className="text-primary">.{settings.siteName.split('.')[1] || 'com'}</span>
                </span>
              )}
            </Link>
            <p className="text-slate-400 leading-relaxed max-w-sm">
              {settings.siteDescription || "Connecting global talent with world-class opportunities. Your journey to a better career starts here."}
            </p>
            <div className="flex items-center gap-3">
              {settings.socialLinks.facebook && (
                <a href={settings.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  <Facebook size={18} />
                </a>
              )}
              {settings.socialLinks.twitter && (
                <a href={settings.socialLinks.twitter} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  <XIcon size={18} />
                </a>
              )}
              {settings.socialLinks.instagram && (
                <a href={settings.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-all">
                  <Instagram size={18} />
                </a>
              )}
            </div>
          </div>

          {/* Dynamic Sections */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-8">
            {footerSections.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">{section.title}</h3>
                <ul className="space-y-4 text-sm">
                  {section.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <Link to={link.href} className="hover:text-primary transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Contact Section */}
          <div className="lg:col-span-3">
            <h3 className="text-white font-bold mb-6 uppercase tracking-wider text-xs">Contact Us</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-primary shrink-0 mt-0.5" />
                <span className="text-slate-400">{settings.contactAddress}</span>
              </li>
              {!settings.hideContactPhone && (
                <li className="flex items-center gap-3">
                  <Phone size={18} className="text-primary shrink-0" />
                  <span className="text-slate-400">{settings.contactPhone}</span>
                </li>
              )}
              {!settings.hideContactEmail && (
                <li className="flex items-center gap-3">
                  <Mail size={18} className="text-primary shrink-0" />
                  <span className="text-slate-400">{settings.contactEmail}</span>
                </li>
              )}
            </ul>
            
            <div className="mt-8 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <p className="text-xs font-medium text-white mb-1">Need Help?</p>
              <p className="text-[10px] text-slate-500 mb-3">Our support team is available 24/7 to assist you.</p>
              <Link to="/help" className="text-xs font-bold text-primary hover:underline">Visit Help Center →</Link>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>{settings.footerCopyright.replace('{year}', new Date().getFullYear().toString())}</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/disclaimer" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
