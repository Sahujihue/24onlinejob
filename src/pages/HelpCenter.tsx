import { HelpCircle, Search, Book, Mail, Shield, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function HelpCenter() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "How do I search for jobs in a specific country?",
      answer: "You can use the country filter on the home page or the jobs listing page. We support over 50 countries worldwide."
    },
    {
      question: "Is 24OnlineJob.com free to use?",
      answer: "Yes, our job search engine is completely free for job seekers. You can browse, search, and save jobs without any cost."
    },
    {
      question: "How do I save a job for later?",
      answer: "To save a job, you need to be signed in. Once signed in, click the bookmark icon on any job card to add it to your 'Saved Jobs' list."
    },
    {
      question: "Where do the job listings come from?",
      answer: "We aggregate live job data from multiple professional sources including Adzuna and JSearch to provide the most up-to-date listings."
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12 space-y-12">
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold">How can we help you?</h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
          <input 
            type="text" 
            placeholder="Search for help articles..." 
            className="w-full pl-12 pr-4 py-3 rounded-xl border bg-card focus:ring-2 focus:ring-primary/20 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Link to="/help/getting-started" className="p-6 rounded-2xl border bg-card text-center space-y-4 hover:border-primary/50 transition-all group">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto group-hover:scale-110 transition-transform">
            <Book size={24} />
          </div>
          <h3 className="font-bold text-lg">Getting Started</h3>
          <p className="text-sm text-muted-foreground">Learn how to create an account and start your job search journey.</p>
          <span className="text-primary font-semibold hover:underline">Read More</span>
        </Link>
        <Link to="/help/account-security" className="p-6 rounded-2xl border bg-card text-center space-y-4 hover:border-primary/50 transition-all group">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto group-hover:scale-110 transition-transform">
            <Shield size={24} />
          </div>
          <h3 className="font-bold text-lg">Account & Security</h3>
          <p className="text-sm text-muted-foreground">Manage your profile, password, and privacy settings.</p>
          <span className="text-primary font-semibold hover:underline">Read More</span>
        </Link>
        <Link to="/contact" className="p-6 rounded-2xl border bg-card text-center space-y-4 hover:border-primary/50 transition-all group">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mx-auto group-hover:scale-110 transition-transform">
            <Mail size={24} />
          </div>
          <h3 className="font-bold text-lg">Contact Support</h3>
          <p className="text-sm text-muted-foreground">Can't find what you're looking for? Our team is here to help.</p>
          <span className="text-primary font-semibold hover:underline">Get in Touch</span>
        </Link>
      </div>

      <div className="max-w-3xl mx-auto space-y-8">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <HelpCircle className="text-primary" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <button 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full p-6 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
              >
                <h4 className="font-bold">{faq.question}</h4>
                <motion.div
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-muted-foreground"
                >
                  <ChevronDown size={20} />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && (
                   <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 text-muted-foreground dark:text-gray-400 text-sm leading-relaxed">
                      <div className="pt-4 border-t border-border/50">
                        {faq.answer}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
