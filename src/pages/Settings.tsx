import React from 'react';
import { User, Bell, Globe, Lock, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';

export const Settings = () => {
  const { addToast } = useToast();

  const handleSave = () => {
    addToast('Settings saved successfully', 'success');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account preferences and settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-2 bg-primary-50 dark:bg-primary-900/10 text-primary-600 rounded-lg text-sm font-medium transition-colors">
            <User className="w-4 h-4" /> Account
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium transition-colors">
            <Globe className="w-4 h-4" /> Language & Region
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium transition-colors">
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium transition-colors">
            <Share2 className="w-4 h-4" /> Sharing
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg text-sm font-medium transition-colors">
            <Lock className="w-4 h-4" /> Security
          </button>
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile details and public information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                  JD
                </div>
                <Button variant="outline">Change Avatar</Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <input type="text" defaultValue="John" className="w-full h-10 px-3 rounded-md border border-input bg-background" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <input type="text" defaultValue="Doe" className="w-full h-10 px-3 rounded-md border border-input bg-background" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <input type="email" defaultValue="john.doe@example.com" disabled className="w-full h-10 px-3 rounded-md border border-input bg-muted text-muted-foreground opacity-50 cursor-not-allowed" />
                <p className="text-xs text-muted-foreground">Email changes require re-authentication.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Manage how the application behaves for you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Marketing Emails</p>
                  <p className="text-sm text-muted-foreground">Receive updates about new features.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
              
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Default Share Link Expiry</p>
                  <p className="text-sm text-muted-foreground">Set a default expiration time for new links.</p>
                </div>
                <select className="h-10 px-3 rounded-md border border-input bg-background text-sm">
                  <option>7 Days</option>
                  <option>30 Days</option>
                  <option>Never</option>
                </select>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
