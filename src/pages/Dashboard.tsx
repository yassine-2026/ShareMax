import { useTranslation } from "react-i18next";
import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HardDrive, Eye, Download, FileImage, FileVideo, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

const chartData = [
  { name: 'Mon', views: 0, downloads: 0 },
  { name: 'Tue', views: 0, downloads: 0 },
  { name: 'Wed', views: 0, downloads: 0 },
  { name: 'Thu', views: 0, downloads: 0 },
  { name: 'Fri', views: 0, downloads: 0 },
  { name: 'Sat', views: 0, downloads: 0 },
  { name: 'Sun', views: 0, downloads: 0 },
];

export const Dashboard = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [recentFiles, setRecentFiles] = useState<any[]>([]);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/files', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.files) {
            setRecentFiles(data.files.slice(0, 5));
            const size = data.files.reduce((acc: number, f: any) => acc + parseInt(f.size || '0'), 0);
            setTotalSize(size);
          }
        })
        .catch(err => {
          console.error(err);
          addToast('Failed to load files', 'error');
        });
    }
  }, [isAuthenticated, addToast]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" />;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = () => {
    // Mock 100GB limit
    const limit = 100 * 1024 * 1024 * 1024; 
    return Math.min((totalSize / limit) * 100, 100);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your media and performance.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Total Storage")}</CardTitle>
            <HardDrive className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSize(totalSize)}</div>
            <p className="text-xs text-muted-foreground mt-1">Of 100 GB allowance</p>
            <div className="w-full h-2 bg-muted rounded-full mt-4">
              <div className="h-full bg-primary-500 rounded-full" style={{ width: `${getStoragePercentage()}%` }} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Total Views")}</CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              No data yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Total Downloads")}</CardTitle>
            <Download className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              No data yet
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("Active Files")}</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentFiles.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Recently uploaded
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full flex items-center justify-center">
              {/* <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--color-foreground)' }}
                  />
                  <Area type="monotone" dataKey="views" stroke="#3b82f6" fillOpacity={1} fill="url(#colorViews)" />
                  <Area type="monotone" dataKey="downloads" stroke="#10b981" fillOpacity={1} fill="url(#colorDownloads)" />
                </AreaChart>
              </ResponsiveContainer> */}
              <p className="text-muted-foreground">Not enough data to display charts yet.</p>
            </div>
          </CardContent>
        </Card>

        {/* Recent Files */}
        <Card>
          <CardHeader>
            <CardTitle>{t("Recent Uploads")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentFiles.length === 0 ? (
                 <p className="text-sm text-muted-foreground">No recent files found.</p>
              ) : (
                recentFiles.map((file) => (
                  <Link to={`/file/${file.id}`} key={file.id} className="flex items-center gap-4 group cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary-600 transition-colors">
                      {file.thumbnailLink ? (
                        <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                      ) : file.mimeType?.startsWith('image') ? (
                        <FileImage className="w-5 h-5" />
                      ) : (
                        <FileVideo className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center text-xs text-muted-foreground gap-2 mt-1">
                        <span>{formatSize(parseInt(file.size || '0'))}</span>
                        <span>•</span>
                        <span>{new Date(file.createdTime).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};;
