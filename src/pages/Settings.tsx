import React, { useState } from 'react';
import { Globe, Bell, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

export const Settings = () => {
  const { addToast } = useToast();
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'language' | 'notifications' | 'security'>('language');
  
  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notificationsEnabled') !== 'false';
  });

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(e.target.value);
    addToast(t('Settings saved successfully'), 'success');
  };

  const handleNotificationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setNotificationsEnabled(isChecked);
    localStorage.setItem('notificationsEnabled', isChecked.toString());
    if (isChecked) {
      addToast(t('Notifications') + ' ' + t('enabled') || 'Notifications enabled', 'success');
    }
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => {
      window.location.href = '/';
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p className="text-muted-foreground mb-4">{t('Authentication Required') || 'Please sign in to access settings.'}</p>
        <Button onClick={() => window.location.href = '/api/auth/google'}>{t('Sign in with Google')}</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('Settings')}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-2 flex flex-col">
          <button 
            onClick={() => setActiveTab('language')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'language' ? 'bg-primary-50 dark:bg-primary-900/10 text-primary-600' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <Globe className="w-4 h-4" /> {t('Language & Region')}
          </button>
          <button 
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'notifications' ? 'bg-primary-50 dark:bg-primary-900/10 text-primary-600' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <Bell className="w-4 h-4" /> {t('Notifications')}
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'security' ? 'bg-primary-50 dark:bg-primary-900/10 text-primary-600' : 'text-muted-foreground hover:bg-muted'}`}
          >
            <Lock className="w-4 h-4" /> {t('Security')}
          </button>
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'language' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Language & Region')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{t('Language')}</p>
                  </div>
                  <select 
                    className="h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={i18n.resolvedLanguage}
                    onChange={handleLanguageChange}
                  >
                    <option value="en">English</option>
                    <option value="ar">العربية (Arabic)</option>
                    <option value="fr">Français (French)</option>
                    <option value="es">Español (Spanish)</option>
                    <option value="de">Deutsch (German)</option>
                    <option value="zh">中文 (Chinese)</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="ru">Русский (Russian)</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Notifications')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{t('In-App Notifications') || 'In-App Notifications'}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={notificationsEnabled}
                      onChange={handleNotificationsChange}
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'security' && (
            <Card>
              <CardHeader>
                <CardTitle>{t('Security')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logged in as</label>
                    <input type="text" value={user?.email || ''} disabled className="w-full h-10 px-3 rounded-md border border-input bg-muted text-muted-foreground opacity-50 cursor-not-allowed" />
                  </div>
                  <Button variant="destructive" onClick={handleLogout}>Sign Out</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
