import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { HardDrive, Eye, Download, FileImage, FileVideo, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

const chartData = [
  { name: 'Mon', views: 4000, downloads: 2400 },
  { name: 'Tue', views: 3000, downloads: 1398 },
  { name: 'Wed', views: 2000, downloads: 9800 },
  { name: 'Thu', views: 2780, downloads: 3908 },
  { name: 'Fri', views: 1890, downloads: 4800 },
  { name: 'Sat', views: 2390, downloads: 3800 },
  { name: 'Sun', views: 3490, downloads: 4300 },
];

const recentFiles = [
  { id: '1', name: 'DSC_0042.NEF', type: 'image', size: '24.5 MB', date: '2 hours ago', views: 142, downloads: 12 },
  { id: '2', name: 'wedding_b-roll.mp4', type: 'video', size: '1.2 GB', date: '5 hours ago', views: 89, downloads: 4 },
  { id: '3', name: 'portrait_edited.tiff', type: 'image', size: '142 MB', date: '1 day ago', views: 412, downloads: 88 },
  { id: '4', name: 'drone_footage.mov', type: 'video', size: '4.5 GB', date: '2 days ago', views: 1024, downloads: 156 },
];

export const Dashboard = () => {
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Storage</CardTitle>
            <HardDrive className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45.2 GB</div>
            <p className="text-xs text-muted-foreground mt-1">Of 100 GB allowance</p>
            <div className="w-full h-2 bg-muted rounded-full mt-4">
              <div className="h-full bg-primary-500 rounded-full" style={{ width: '45%' }} />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
            <Eye className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24,592</div>
            <p className="text-xs text-green-500 mt-1 flex items-center">
              +14% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Downloads</CardTitle>
            <Download className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3,201</div>
            <p className="text-xs text-green-500 mt-1 flex items-center">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Files</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across 12 folders
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
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
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
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Files */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary-600 transition-colors">
                    {file.type === 'image' ? <FileImage className="w-5 h-5" /> : <FileVideo className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <div className="flex items-center text-xs text-muted-foreground gap-2 mt-1">
                      <span>{file.size}</span>
                      <span>•</span>
                      <span>{file.date}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{file.views}</div>
                    <div className="text-xs text-muted-foreground">views</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
