import React from 'react';
import { Link } from 'react-router-dom';
import { UploadCloud } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 text-primary-600 dark:text-primary-500 mb-4">
              <UploadCloud className="w-6 h-6" />
              <span className="font-display font-bold text-lg tracking-tight text-foreground">ShareMax</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A professional platform for sharing photos and videos in their original quality securely and blazingly fast.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-3">
              <li><Link to="/upload" className="text-sm text-muted-foreground hover:text-primary-600 transition-colors">Upload</Link></li>
              <li><Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary-600 transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-3">
              <li><Link to="/faq" className="text-sm text-muted-foreground hover:text-primary-600 transition-colors">FAQ</Link></li>
              <li><Link to="/contact" className="text-sm text-muted-foreground hover:text-primary-600 transition-colors">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              <li><Link to="/privacy" className="text-sm text-muted-foreground hover:text-primary-600 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-muted-foreground hover:text-primary-600 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} ShareMax. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
