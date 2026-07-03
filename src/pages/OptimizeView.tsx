import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Video, Download, Link as LinkIcon, Loader2, Sparkles, AlertCircle, ArrowLeft, CheckCircle2, SplitSquareHorizontal } from 'lucide-react';
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

interface OptimizationResult {
  alreadyOptimized: boolean;
  originalInfo: VideoInfo;
  originalSize: number;
  optimizedInfo: VideoInfo;
  optimizedSize: number;
  driveId: string;
  webViewLink?: string;
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: OptimizationResult;
  error?: string;
}

export const OptimizeView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [activePlatform, setActivePlatform] = useState<string | null>(null);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    const analyzeVideo = async () => {
      try {
        setIsAnalyzing(true);
        setAnalyzeError(null);
        const res = await fetch(`/api/video/${id}/analyze`);
        if (!res.ok) throw new Error('Failed to analyze video');
        const data = await res.json();
        setVideoInfo(data.info);
      } catch (err: any) {
        console.error('Analyze error:', err);
        setAnalyzeError(err.message || 'Analysis failed');
      } finally {
        setIsAnalyzing(false);
      }
    };
    
    if (id) analyzeVideo();
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const checkJobStatus = async () => {
      if (!activeJobId) return;
      try {
        const res = await fetch(`/api/video/job/${activeJobId}`);
        if (!res.ok) throw new Error('Failed to fetch job status');
        const data = await res.json();
        setJobStatus(data);
        
        if (data.status === 'completed' || data.status === 'error') {
          setActiveJobId(null); // stop polling
          if (data.status === 'completed') {
            if (data.result?.alreadyOptimized) {
              addToast('This video is already optimized for this platform!', 'success');
            } else {
              addToast('Optimization completed successfully!', 'success');
            }
          } else if (data.status === 'error') {
            addToast(`Optimization failed: ${data.error}`, 'error');
          }
        }
      } catch (err) {
        console.error('Status check error', err);
      }
    };

    if (activeJobId) {
      interval = setInterval(checkJobStatus, 2000);
      checkJobStatus(); // check immediately
    }
    
    return () => clearInterval(interval);
  }, [activeJobId, addToast]);

  const handleOptimize = async (platform: string) => {
    try {
      setActivePlatform(platform);
      setJobStatus({ status: 'pending', progress: 0 });
      setShowCompare(false);
      
      const res = await fetch(`/api/video/${id}/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start optimization');
      }
      
      const { jobId } = await res.json();
      setActiveJobId(jobId);
    } catch (err: any) {
      console.error('Optimize error:', err);
      addToast(err.message || 'Failed to start optimization', 'error');
      setJobStatus({ status: 'error', progress: 0, error: err.message });
      setActivePlatform(null);
    }
  };

  const formatBitrate = (bits: number) => {
    if (!bits) return 'Unknown';
    return `${(bits / 1000).toFixed(0)} kbps`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const copyShareLink = () => {
    if (jobStatus?.result?.driveId) {
      navigator.clipboard.writeText(`${window.location.origin}/share/${jobStatus.result.driveId}`);
      addToast('Share link copied to clipboard', 'success');
    }
  };

  const downloadVideo = () => {
    if (jobStatus?.result?.driveId) {
      window.location.href = `https://drive.google.com/uc?export=download&id=${jobStatus.result.driveId}`;
    }
  };

  if (isAnalyzing) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
        <h2 className="text-2xl font-bold mb-2">Analyzing Video</h2>
        <p className="text-muted-foreground">Extracting metadata using FFprobe...</p>
      </div>
    );
  }

  if (analyzeError || !videoInfo) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-700 dark:text-red-400 mb-2">Analysis Failed</h2>
          <p className="text-red-600 dark:text-red-500 mb-6">{analyzeError}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  const platforms = [
    { id: 'tiktok', name: 'TikTok', desc: '1080x1920 • 30fps', color: 'border-primary-200 hover:border-primary-500', icon: Sparkles },
    { id: 'instagram', name: 'Instagram Reels', desc: 'High Quality Portrait', color: 'border-pink-200 hover:border-pink-500', icon: Sparkles },
    { id: 'facebook', name: 'Facebook', desc: '1080p Standard', color: 'border-blue-200 hover:border-blue-500', icon: Video },
    { id: 'youtube_shorts', name: 'YouTube Shorts', desc: 'High Bitrate Portrait', color: 'border-red-200 hover:border-red-500', icon: Video },
    { id: 'whatsapp', name: 'WhatsApp', desc: 'Fast Sharing < 16MB', color: 'border-green-200 hover:border-green-500', icon: Sparkles },
    { id: 'telegram', name: 'Telegram', desc: '720p Optimized', color: 'border-sky-200 hover:border-sky-500', icon: Video },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mb-6 -ml-4 text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
      </Button>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Column - Video Info */}
        <div className="w-full md:w-1/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Video className="w-5 h-5 text-primary-500" /> Original Video
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full aspect-video bg-black rounded-lg overflow-hidden mb-6 relative">
                <iframe 
                  src={`https://drive.google.com/file/d/${id}/preview`} 
                  className="w-full h-full absolute inset-0 border-0"
                ></iframe>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Resolution</span> <span className="font-medium">{videoInfo.resolution}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">FPS</span> <span className="font-medium">{videoInfo.fps}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Bitrate</span> <span className="font-medium">{formatBitrate(videoInfo.bitrate)}</span></div>
                <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Codec</span> <span className="font-medium">{videoInfo.format}</span></div>
                <div className="flex justify-between pb-2"><span className="text-muted-foreground">Duration</span> <span className="font-medium">{(videoInfo.duration).toFixed(1)}s</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Actions & Status */}
        <div className="w-full md:w-2/3 space-y-6">
          {!jobStatus || jobStatus.status === 'error' ? (
            <Card className="border-primary-100 dark:border-primary-900/50">
              <CardHeader>
                <CardTitle>Optimize for Social Media</CardTitle>
                <CardDescription>
                  Select a platform. We will use FFmpeg to encode the video with the best settings.
                </CardDescription>
                {jobStatus?.status === 'error' && (
                  <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md text-sm border border-red-200">
                    <AlertCircle className="w-4 h-4 inline mr-2" /> {jobStatus.error}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {platforms.map(p => (
                    <div key={p.id} className={`border rounded-xl p-4 transition-all cursor-pointer ${p.color}`} onClick={() => handleOptimize(p.id)}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-muted rounded-lg"><p.icon className="w-5 h-5 text-foreground" /></div>
                        <div>
                          <h4 className="font-semibold">{p.name}</h4>
                          <p className="text-xs text-muted-foreground">{p.desc}</p>
                        </div>
                      </div>
                      <Button variant="secondary" className="w-full mt-3">Optimize</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary-200 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {jobStatus.status === 'completed' ? (
                    <><CheckCircle2 className="w-6 h-6 text-green-500" /> Optimization Complete</>
                  ) : (
                    <><Loader2 className="w-6 h-6 text-primary-500 animate-spin" /> Processing Video</>
                  )}
                </CardTitle>
                <CardDescription>
                  {jobStatus.status === 'completed' 
                    ? `Successfully processed for ${platforms.find(p => p.id === activePlatform)?.name}`
                    : `Encoding video for ${platforms.find(p => p.id === activePlatform)?.name}...`}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Progress Bar */}
                {jobStatus.status === 'processing' || jobStatus.status === 'pending' ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>{jobStatus.status === 'pending' ? 'Starting FFmpeg...' : 'Encoding...'}</span>
                      <span>{jobStatus.progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
                        style={{ width: `${jobStatus.progress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Results Actions */}
                {jobStatus.status === 'completed' && jobStatus.result && (
                  <div className="space-y-6">
                    {jobStatus.result.alreadyOptimized && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <p className="font-medium">This video is already optimized!</p>
                          <p className="text-sm opacity-90">No re-encoding needed for this platform.</p>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-3">
                      <Button onClick={() => window.open(`/share/${jobStatus.result!.driveId}`, '_blank')}>
                        <Video className="w-4 h-4 mr-2" /> Preview
                      </Button>
                      <Button variant="outline" onClick={downloadVideo}>
                        <Download className="w-4 h-4 mr-2" /> Download
                      </Button>
                      <Button variant="outline" onClick={copyShareLink}>
                        <LinkIcon className="w-4 h-4 mr-2" /> Share Link
                      </Button>
                      <Button variant="secondary" onClick={() => setShowCompare(!showCompare)}>
                        <SplitSquareHorizontal className="w-4 h-4 mr-2" /> Compare
                      </Button>
                      <Button variant="ghost" onClick={() => setJobStatus(null)}>
                        Done
                      </Button>
                    </div>

                    {/* Compare Section */}
                    {showCompare && (
                      <div className="mt-6 pt-6 border-t grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4">
                        <div className="space-y-3 bg-muted/30 p-4 rounded-xl border">
                          <h4 className="font-semibold text-muted-foreground mb-4">Original</h4>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Resolution</span> <span className="font-medium">{jobStatus.result.originalInfo.resolution}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Bitrate</span> <span className="font-medium">{formatBitrate(jobStatus.result.originalInfo.bitrate)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">FPS</span> <span className="font-medium">{jobStatus.result.originalInfo.fps}</span></div>
                          <div className="flex justify-between text-sm pt-2 border-t mt-2"><span className="text-muted-foreground">File Size</span> <span className="font-bold">{formatSize(jobStatus.result.originalSize)}</span></div>
                        </div>
                        <div className="space-y-3 bg-primary-50/50 dark:bg-primary-900/10 p-4 rounded-xl border border-primary-100">
                          <h4 className="font-semibold text-primary-600 mb-4">Optimized</h4>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Resolution</span> <span className="font-medium">{jobStatus.result.optimizedInfo.resolution}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Bitrate</span> <span className="font-medium">{formatBitrate(jobStatus.result.optimizedInfo.bitrate)}</span></div>
                          <div className="flex justify-between text-sm"><span className="text-muted-foreground">FPS</span> <span className="font-medium">{jobStatus.result.optimizedInfo.fps}</span></div>
                          <div className="flex justify-between text-sm pt-2 border-t mt-2"><span className="text-muted-foreground">File Size</span> <span className="font-bold text-primary-600">{formatSize(jobStatus.result.optimizedSize)}</span></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
