import { Book, Search, Briefcase, UserPlus, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function GettingStarted() {
  const steps = [
    {
      title: "Create an Account",
      description: "Sign up with your email or Google account to unlock all features like saving jobs and tracking applications.",
      icon: <UserPlus className="text-primary" size={24} />,
      link: "/auth",
      linkText: "Sign Up Now"
    },
    {
      title: "Complete Your Profile",
      description: "Add your skills, experience, and preferred job locations to get personalized job recommendations.",
      icon: <CheckCircle2 className="text-primary" size={24} />,
      link: "/profile",
      linkText: "Go to Profile"
    },
    {
      title: "Search & Filter",
      description: "Use our advanced search engine to find jobs across 50+ countries. Filter by salary, job type, and more.",
      icon: <Search className="text-primary" size={24} />,
      link: "/jobs",
      linkText: "Start Searching"
    },
    {
      title: "Apply & Track",
      description: "Apply directly on employer sites and use our built-in tracker to manage your application status.",
      icon: <Briefcase className="text-primary" size={24} />,
      link: "/dashboard",
      linkText: "View Dashboard"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary mb-4">
            <Book size={32} />
          </div>
          <h1 className="text-4xl font-bold">Getting Started</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Welcome to 24OnlineJob.com! Follow these simple steps to make the most of our global job search platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="p-8 rounded-3xl border bg-card hover:border-primary/50 transition-all space-y-4 shadow-sm">
              <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center">
                {step.icon}
              </div>
              <h3 className="text-2xl font-bold">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {step.description}
              </p>
              <Link to={step.link} className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
                {step.linkText}
                <ArrowRight size={18} />
              </Link>
            </div>
          ))}
        </div>

        <div className="bg-primary/5 p-8 rounded-3xl border border-primary/20 text-center space-y-6">
          <h2 className="text-2xl font-bold">Ready to find your next career move?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join thousands of professionals who have found their dream jobs through our platform.
          </p>
          <Link 
            to="/jobs" 
            className="inline-flex items-center justify-center rounded-xl bg-primary px-8 py-3.5 text-lg font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Browse All Jobs
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
