import { Mail, Phone, MapPin, Send } from 'lucide-react';
import React, { useState } from 'react';
import { useSettings } from '../hooks/useSettings';

export default function ContactUs() {
  const { settings } = useSettings();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Get in Touch</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Have questions about our platform or need assistance with your job search? Our team is here to support you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1 space-y-8">
            <div className="space-y-6">
              {!settings.hideContactEmail && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <Mail size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">Email Us</h3>
                    <p className="text-sm text-muted-foreground">{settings.contactEmail}</p>
                  </div>
                </div>
              )}
              {!settings.hideContactPhone && (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                    <Phone size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">Call Us</h3>
                    <p className="text-sm text-muted-foreground">{settings.contactPhone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-bold">Visit Us</h3>
                  <p className="text-sm text-muted-foreground">{settings.contactAddress}</p>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-muted/30 border space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <Mail size={20} className="text-primary" />
                Online Support
              </h3>
              <p className="text-sm text-muted-foreground">
                For the fastest response, please use the contact form. Our team typically responds within 24-48 hours.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2">
            {submitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 bg-card p-12 rounded-3xl border border-primary/20">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                  <Send size={40} />
                </div>
                <h2 className="text-2xl font-bold">Message Sent!</h2>
                <p className="text-muted-foreground">
                  Thank you for reaching out. We've received your message and will get back to you within 24-48 hours.
                </p>
                <button 
                  onClick={() => setSubmitted(false)}
                  className="text-primary font-semibold hover:underline"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="bg-card p-8 md:p-10 rounded-3xl border shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Full Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email Address</label>
                    <input 
                      type="email" 
                      required
                      placeholder="john@example.com"
                      className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <input 
                    type="text" 
                    required
                    placeholder="How can we help?"
                    className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Message</label>
                  <textarea 
                    required
                    rows={6}
                    placeholder="Tell us more about your inquiry..."
                    className="w-full px-4 py-2.5 rounded-lg border bg-background focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                  ></textarea>
                </div>
                <button 
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  Send Message
                  <Send size={20} />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
