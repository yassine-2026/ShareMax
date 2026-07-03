import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Video, Download, Play, Loader2, Sparkles, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface VideoInfo {
  resolution: string;
  width: number;
  height: number;
  bitrate: number;
  fps: number;
  aspectRatio: string;
  duration: number;
  format: string;
}

interface SmartVideoExportProps {
  fileId: string;
  fileName: string;
}

export const SmartVideoExport: React.FC<SmartVideoExportProps> = ({ fileId, fileName }) => {
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPlatform, setExportingPlatform] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const analyzeVideo = async () => {
      try {
        setIsAnalyzing(true);
        setError(null);
        const res = await fetch(`/api/video/${fileId}/analyze`);
        if (!res.ok) throw new Error('Failed to analyze video');
        const data = await res.json();
        setVideoInfo(data.info);
      } catch (err: any) {
        console.error('Analyze error:', err);
        setError(err.message || 'Analysis failed');
      } finally {
        setIsAnalyzing(false);
      }
    };
    
    analyzeVideo();
  }, [fileId]);

  const handleExport = async (platform: string) => {
    try {
      setExportingPlatform(platform);
      
      // Instead of downloading directly via window.location, we can trigger a download
      // by creating a temporary anchor link.
      // However, fetching it first allows us to show the spinner until download starts.
      
      const res = await fetch(`/api/video/${fileId}/export?platform=${platform}`);
      if (!res.ok) throw new Error('Export failed. Please try again.');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${platform}_${fileName}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      addToast(`Successfully exported for ${platform}`, 'success');
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Export failed');
      addToast(err.message || 'Export failed', 'error');
    } finally {
      setExportingPlatform(null);
    }
  };

  const formatBitrate = (bits: number) => {
    if (!bits) return 'Unknown';
    return `${(bits / 1000).toFixed(0)} kbps`;
  };

  const formatDuration = (sec: number) => {
    if (!sec) return 'Unknown';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-xl border border-dashed border-primary-300">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin mb-4" />
        <h4 className="font-medium text-lg">Smart Analyzing Video...</h4>
        <p className="text-sm text-muted-foreground">Extracting resolution, bitrate, and optimizing for social platforms</p>
      </div>
    );
  }

  if (error && !videoInfo) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-dashed border-red-200">
        <AlertCircle className="w-8 h-8 text-red-500 mb-4" />
        <h4 className="font-medium text-lg text-red-700 dark:text-red-400">Analysis Failed</h4>
        <p className="text-sm text-red-600 dark:text-red-500 mb-4">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  return (
    <Card className="border-primary-200 bg-gradient-to-b from-white to-primary-50/30 dark:from-background dark:to-primary-900/10 shadow-sm mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-500" />
          <CardTitle className="text-lg">Smart Video Export Assistant</CardTitle>
        </div>
        <CardDescription>
          Your original file is safely stored in Google Drive. Choose an optimized format for sharing below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {videoInfo && (
          <>
            <div className="w-full aspect-video bg-black rounded-lg overflow-hidden border border-border shadow-sm mb-6 relative">
              <iframe 
                src={`https://drive.google.com/file/d/${fileId}/preview`} 
                className="w-full h-full absolute inset-0 border-0"
                allow="autoplay"
              ></iframe>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/40 rounded-lg border">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Resolution</p>
              <p className="font-medium">{videoInfo.resolution}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">FPS</p>
              <p className="font-medium">{videoInfo.fps || 'Unknown'} fps</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Duration</p>
              <p className="font-medium">{formatDuration(videoInfo.duration)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Bitrate</p>
              <p className="font-medium">{formatBitrate(videoInfo.bitrate)}</p>
            </div>
          </div>
          </>
        )}

        <div className="space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Video className="w-4 h-4" /> Best Upload Settings
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4 border-primary-200 hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20"
              onClick={() => handleExport('tiktok')}
              disabled={exportingPlatform !== null}
            >
              {exportingPlatform === 'tiktok' ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin text-primary-500" />
              ) : (
                <Download className="w-5 h-5 mr-3 text-primary-500" />
              )}
              <div className="text-left">
                <p className="font-semibold text-sm">Export for TikTok</p>
                <p className="text-xs text-muted-foreground font-normal">1080x1920 • 30fps • Optimized</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4 border-pink-200 hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20"
              onClick={() => handleExport('instagram')}
              disabled={exportingPlatform !== null}
            >
              {exportingPlatform === 'instagram' ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin text-pink-500" />
              ) : (
                <Download className="w-5 h-5 mr-3 text-pink-500" />
              )}
              <div className="text-left">
                <p className="font-semibold text-sm">Export for Instagram Reels</p>
                <p className="text-xs text-muted-foreground font-normal">1080x1920 • High Quality</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4 border-red-200 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => handleExport('youtube_shorts')}
              disabled={exportingPlatform !== null}
            >
              {exportingPlatform === 'youtube_shorts' ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin text-red-500" />
              ) : (
                <Download className="w-5 h-5 mr-3 text-red-500" />
              )}
              <div className="text-left">
                <p className="font-semibold text-sm">Export for YouTube Shorts</p>
                <p className="text-xs text-muted-foreground font-normal">1080x1920 • High Bitrate</p>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start h-auto py-3 px-4 border-blue-200 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
              onClick={() => handleExport('facebook')}
              disabled={exportingPlatform !== null}
            >
              {exportingPlatform === 'facebook' ? (
                <Loader2 className="w-5 h-5 mr-3 animate-spin text-blue-500" />
              ) : (
                <Download className="w-5 h-5 mr-3 text-blue-500" />
              )}
              <div className="text-left">
                <p className="font-semibold text-sm">Export for Facebook</p>
                <p className="text-xs text-muted-foreground font-normal">1080p • Standard</p>
              </div>
            </Button>
          </div>
          
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <Info className="w-4 h-4" />
               Processed in real-time using FFmpeg backend
             </div>
             <Button 
               variant="ghost" 
               size="sm"
               className="text-muted-foreground"
               onClick={() => handleExport('low_size')}
               disabled={exportingPlatform !== null}
             >
               {exportingPlatform === 'low_size' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
               Low Size Version
             </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
