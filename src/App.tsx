/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { ToastContainer } from '@/components/ui/ToastContainer';
import { AppLayout } from '@/components/layout/AppLayout';

import { Home } from '@/pages/Home';
import { Upload } from '@/pages/Upload';
import { Dashboard } from '@/pages/Dashboard';
import { Settings } from '@/pages/Settings';
import { FileView } from '@/pages/FileView';
import { FAQ } from '@/pages/FAQ';
import { Contact } from '@/pages/Contact';
import { Privacy } from '@/pages/Privacy';
import { Terms } from '@/pages/Terms';
import { NotFound } from '@/pages/NotFound';
import { ShareView } from '@/pages/ShareView';
import { OptimizeView } from '@/pages/OptimizeView';
import { SocialOptimizer } from '@/pages/SocialOptimizer';

export default function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <ToastProvider>
        <AuthProvider>
          <Router>
            <AppLayout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/file/:id" element={<FileView />} />
                <Route path="/share/:id" element={<ShareView />} />
                <Route path="/optimize/:id" element={<OptimizeView />} />
                <Route path="/optimizer" element={<SocialOptimizer />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          </Router>
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
