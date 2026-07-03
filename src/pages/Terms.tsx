import React from 'react';

export const Terms = () => {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl prose dark:prose-invert">
      <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-8">Terms of Service</h1>
      <p className="text-muted-foreground mb-6">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="space-y-6 text-foreground">
        <section>
          <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
          <p>By accessing or using ShareMax, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">2. Acceptable Use</h2>
          <p>You agree not to use the service to upload or share any content that is illegal, infringes on intellectual property rights, or contains malicious code.</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">3. Account Responsibilities</h2>
          <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
        </section>
      </div>
    </div>
  );
};
