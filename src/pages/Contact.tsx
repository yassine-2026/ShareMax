import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

export const Contact = () => {
  const { addToast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Message sent! We will get back to you soon.', 'success');
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Contact Us</h1>
        <p className="text-lg text-muted-foreground">We'd love to hear from you. Send us a message.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send a Message</CardTitle>
          <CardDescription>Fill out the form below and our support team will respond within 24 hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">First Name</label>
                <input required type="text" className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="John" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Last Name</label>
                <input required type="text" className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Doe" />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <input required type="email" className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="john@example.com" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <textarea required rows={5} className="w-full p-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" placeholder="How can we help you?" />
            </div>

            <Button type="submit" className="w-full">Send Message</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
