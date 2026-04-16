import { Shield, Lock, Eye, Mail, Trash2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

export default function AccountSecurity() {
  const sections = [
    {
      title: "Password Management",
      description: "Learn how to reset your password or update it to keep your account secure.",
      icon: <Lock className="text-primary" size={24} />,
      link: "/forgot-password",
      linkText: "Reset Password"
    },
    {
      title: "Email Verification",
      description: "Ensure your email is verified to receive job alerts and security notifications.",
      icon: <Mail className="text-primary" size={24} />,
      link: "/verify-email",
      linkText: "Verify Email"
    },
    {
      title: "Privacy Settings",
      description: "Control who can see your profile and how your data is used on the platform.",
      icon: <Eye className="text-primary" size={24} />,
      link: "/profile",
      linkText: "Privacy Settings"
    },
    {
      title: "Account Deletion",
      description: "Understand the process of permanently removing your data from our servers.",
      icon: <Trash2 className="text-destructive" size={24} />,
      link: "/contact",
      linkText: "Contact Support"
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
            <Shield size={32} />
          </div>
          <h1 className="text-4xl font-bold">Account & Security</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
            Your security is our top priority. Learn how to manage your account and keep your data safe.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {sections.map((section, i) => (
            <div key={i} className="p-8 rounded-3xl border bg-card hover:border-primary/50 transition-all space-y-4 shadow-sm">
              <div className="w-12 h-12 bg-primary/5 rounded-xl flex items-center justify-center">
                {section.icon}
              </div>
              <h3 className="text-2xl font-bold">{section.title}</h3>
              <p className="text-muted-foreground leading-relaxed">
                {section.description}
              </p>
              <Link to={section.link} className="inline-flex items-center gap-2 text-primary font-bold hover:underline">
                {section.linkText}
                <ArrowRight size={18} />
              </Link>
            </div>
          ))}
        </div>

        <div className="bg-muted/30 p-8 rounded-3xl border space-y-6">
          <h2 className="text-2xl font-bold">Security Best Practices</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              Use a strong, unique password for your account.
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              Enable two-factor authentication if using Google login.
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              Never share your login credentials with anyone.
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              Be wary of phishing emails claiming to be from us.
            </li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
