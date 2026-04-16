import { Target, Users, Globe, Award, ShieldCheck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AboutUs() {
  const stats = [
    { label: 'Live Jobs', value: '2M+', icon: <Zap className="text-amber-500" /> },
    { label: 'Countries', value: '50+', icon: <Globe className="text-blue-500" /> },
    { label: 'Companies', value: '10k+', icon: <Users className="text-primary" /> },
    { label: 'Success Rate', value: '98%', icon: <Award className="text-emerald-500" /> },
  ];

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative py-20 bg-muted/30 overflow-hidden">
        <div className="container mx-auto px-4 text-center space-y-6 relative z-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-6xl font-extrabold tracking-tight"
          >
            Empowering Careers <br />
            <span className="text-primary">Without Borders</span>
          </motion.h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            At 24OnlineJob.com, we believe that the right opportunity can come from anywhere. We're on a mission to connect talent with global possibilities.
          </p>
        </div>
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
      </section>

      {/* Our Story */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Our Story</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Founded in 2024, 24OnlineJob.com started with a simple observation: the job market was becoming increasingly global, but the tools to navigate it remained fragmented and localized. Job seekers were spending hours jumping between dozens of sites, often missing the best opportunities because they were hidden behind geographic barriers.
              </p>
              <p>
                We set out to build a platform that would act as a single window to the world's job market. By aggregating live data from top professional sources and applying advanced filtering technology, we've created a search engine that is both comprehensive and incredibly precise.
              </p>
              <p>
                Today, 24OnlineJob.com serves millions of users across 50+ countries, helping them discover roles that match their skills, values, and lifestyle—whether that's a high-growth startup in London, a tech giant in Silicon Valley, or a remote-first company anywhere on the planet.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat, i) => (
              <div key={i} className="p-8 rounded-3xl border bg-card space-y-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                  {stat.icon}
                </div>
                <div>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="bg-muted/30 py-20">
        <div className="container mx-auto px-4 space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold">Our Core Values</h2>
            <p className="text-muted-foreground">The principles that guide everything we build</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-card border space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Target size={24} />
              </div>
              <h3 className="text-xl font-bold">Transparency First</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We believe in clear, honest communication. From salary ranges to company culture, we strive to provide the most accurate and transparent data possible to help you make informed decisions.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-card border space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-xl font-bold">User Privacy</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Your data is your own. We implement industry-leading security measures to ensure your personal information and search history remain private and protected at all times.
              </p>
            </div>
            <div className="p-8 rounded-3xl bg-card border space-y-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Globe size={24} />
              </div>
              <h3 className="text-xl font-bold">Global Accessibility</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Opportunity should be accessible to everyone, regardless of where they are. We're committed to breaking down geographic barriers and making the global job market truly inclusive.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="container mx-auto px-4 text-center max-w-3xl space-y-8">
        <h2 className="text-3xl font-bold">Our Mission</h2>
        <p className="text-xl text-muted-foreground italic leading-relaxed">
          "To build the world's most trusted and comprehensive bridge between talent and opportunity, empowering every individual to find meaningful work that transcends borders."
        </p>
        <div className="pt-8">
          <button className="px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            Join Our Journey
          </button>
        </div>
      </section>
    </div>
  );
}
