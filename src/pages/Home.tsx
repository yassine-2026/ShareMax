import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Image as ImageIcon, Zap, Shield, HardDrive } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const Home = () => {
  const features = [
    {
      icon: <ImageIcon className="w-6 h-6 text-primary-500" />,
      title: "Original Quality",
      description: "We never compress your memories. Share photos and videos exactly as you captured them."
    },
    {
      icon: <Zap className="w-6 h-6 text-primary-500" />,
      title: "Lightning Fast",
      description: "Optimized delivery network ensures your files upload and download at maximum speed."
    },
    {
      icon: <Shield className="w-6 h-6 text-primary-500" />,
      title: "Secure & Private",
      description: "End-to-end encryption and advanced privacy controls keep your content safe."
    },
    {
      icon: <HardDrive className="w-6 h-6 text-primary-500" />,
      title: "Generous Storage",
      description: "Start with plenty of space for your high-resolution media, upgrade when you need more."
    }
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50 to-transparent dark:from-primary-900/20 dark:to-transparent -z-10" />
        
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-3xl mx-auto"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
              Share your moments in <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">perfect quality</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              The professional platform for creators, photographers, and anyone who cares about pixel-perfect media sharing. No compression, no limits.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/upload">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8 h-14">
                  Start Uploading
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg px-8 h-14">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why choose ShareMax?</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built with modern technology to provide the best sharing experience possible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-card p-8 rounded-2xl border shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
