import React from 'react';

export const Privacy = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl prose dark:prose-invert">
      <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">Privacy Policy</h1>
      <p className="text-muted-foreground mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-foreground">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
          <p>We collect information you provide directly to us when you create an account, upload files, or communicate with us. This may include your name, email address, and the content you upload.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services. We do not sell your personal information or uploaded content to third parties.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Data Security</h2>
          <p>We implement reasonable security measures to protect your personal information and uploaded files from unauthorized access, alteration, or disclosure.</p>
        </section>
      </div>
    </div>
  );
};
