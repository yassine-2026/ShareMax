import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export const FAQ = () => {
  const faqs = [
    {
      q: "What is ShareMax?",
      a: "ShareMax is a professional file sharing platform designed for creators, photographers, and professionals who need to share media in its original, uncompressed quality."
    },
    {
      q: "Are my files secure?",
      a: "Yes. All uploads are encrypted in transit and at rest. You can also set passwords and expiration dates for your shared links to ensure only intended recipients can access them."
    },
    {
      q: "Do you compress images or videos?",
      a: "No. Unlike social media or typical messaging apps, we never alter or compress your files. What you upload is exactly what gets downloaded."
    },
    {
      q: "What is the maximum file size?",
      a: "Free accounts can upload files up to 2GB each. Premium accounts can upload individual files up to 50GB."
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">Frequently Asked Questions</h1>
        <p className="text-lg text-muted-foreground">Find answers to common questions about ShareMax.</p>
      </div>

      <div className="space-y-6">
        {faqs.map((faq, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-lg">{faq.q}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{faq.a}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
