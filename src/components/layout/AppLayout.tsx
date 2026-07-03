import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
};
