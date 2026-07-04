import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Video, UploadCloud, Sparkles, Loader2, CheckCircle2, AlertCircle, SplitSquareHorizontal, Download, ArrowLeft, RefreshCw, Twitter, Linkedin, Facebook, MessageCircle, Send } from 'lucide-react';
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

interface UploadResponse {
  fileId: string;
  originalName: string;
  info: VideoInfo;
  size: number;
}

interface OptimizationResult {
  alreadyOptimized: boolean;
  originalInfo: VideoInfo;
  originalSize: number;
  optimizedInfo: VideoInfo;
  optimizedSize: number;
  optimizedFileId: string;
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: OptimizationResult;
  error?: string;
}

const platforms = [
  { id: 'tiktok', name: 'TikTok', desc: '1080x1920 • 30fps', color: 'border-primary-200 hover:border-primary-500', icon: Sparkles },
  { id: 'instagram', name: 'Instagram Reels', desc: 'High Quality Portrait', color: 'border-pink-200 hover:border-pink-500', icon: Sparkles },
  { id: 'youtube_shorts', name: 'YouTube Shorts', desc: 'High Bitrate Portrait', color: 'border-red-200 hover:border-red-500', icon: Video },
  { id: 'facebook', name: 'Facebook', desc: '1080p Standard', color: 'border-blue-200 hover:border-blue-500', icon: Facebook },
  { id: 'whatsapp', name: 'WhatsApp', desc: 'Fast Sharing < 16MB', color: 'border-green-200 hover:border-green-500', icon: MessageCircle },
  { id: 'telegram', name: 'Telegram', desc: '720p/1080p Optimized', color: 'border-sky-200 hover:border-sky-500', icon: Send },
  { id: 'twitter', name: 'X (Twitter)', desc: '1080p • 40fps max', color: 'border-slate-300 hover:border-slate-800', icon: Twitter },
  { id: 'linkedin', name: 'LinkedIn', desc: 'Professional Quality', color: 'border-indigo-200 hover:border-indigo-500', icon: Linkedin },
];

export const SocialOptimizer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [processingTime, setProcessingTime] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [previewUrl]);

  const handleFile = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith('video/')) {
      addToast('Please select a valid video file.', 'error');
      return;
    }
    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    setUploadData(null);
    setSelectedPlatform(null);
    setJobStatus(null);
    setShowCompare(false);
    
    // Auto upload and analyze
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const res = await fetch('/api/optimizer/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error(await res.text());
      const data: UploadResponse = await res.json();
      setUploadData(data);
    } catch (err: any) {
      console.error('Upload error:', err);
      addToast('Failed to upload and analyze video.', 'error');
      setFile(null);
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const startOptimization = async () => {
    if (!uploadData || !selectedPlatform) return;
    
    try {
      setJobStatus({ status: 'pending', progress: 0 });
      setProcessingTime(0);
      timerRef.current = setInterval(() => {
        setProcessingTime(prev => prev + 1);
      }, 1000);

      const res = await fetch('/api/optimizer/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploadData.fileId, platform: selectedPlatform })
      });
      
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to start optimization');
      }
      
      const { jobId } = await res.json();
      setActiveJobId(jobId);
    } catch (err: any) {
      console.error('Process error:', err);
      addToast(err.message || 'Error', 'error');
      setJobStatus({ status: 'error', progress: 0, error: err.message });
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    const checkJobStatus = async () => {
      if (!activeJobId) return;
      try {
        const res = await fetch('/api/video/job/' + activeJobId); // Reusing the same job map endpoint
        if (!res.ok) throw new Error('Failed to fetch job status');
        const data = await res.json();
        setJobStatus(data);
        
        if (data.status === 'completed' || data.status === 'error') {
          setActiveJobId(null);
          if (timerRef.current) clearInterval(timerRef.current);
          if (data.status === 'completed') {
            addToast('Optimization completed!', 'success');
          } else {
            addToast(`Failed: ${data.error}`, 'error');
          }
        }
      } catch (err) {
        console.error('Status check error', err);
      }
    };

    if (activeJobId) {
      interval = setInterval(checkJobStatus, 1500);
      checkJobStatus();
    }
    
    return () => clearInterval(interval);
  }, [activeJobId, addToast]);

  const formatBitrate = (bits: number) => {
    if (!bits) return 'Unknown';
    return `${(bits / 1000).toFixed(0)} kbps`;
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  const renderUploadState = () => (
    <div 
      className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors ${isDragging ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-border bg-muted/20'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <UploadCloud className="w-10 h-10" />
      </div>
      <h3 className="text-2xl font-semibold mb-2">Upload Video to Optimize</h3>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto">
        Drag and drop your video here, or click to browse. We support MP4, MOV, and most standard formats.
      </p>
      <input 
        type="file" 
        accept="video/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
      />
      <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Video className="w-5 h-5 mr-2" />}
        {uploading ? 'Analyzing...' : 'Choose File'}
      </Button>
    </div>
  );

  const renderConfigurationState = () => (
    <div className="space-y-8 animate-in fade-in zoom-in-95">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Original File</CardTitle>
            </CardHeader>
            <CardContent>
              {previewUrl && (
                <div className="w-full aspect-video bg-black rounded-lg overflow-hidden mb-4 relative">
                  <video src={previewUrl} className="w-full h-full object-contain" controls />
                </div>
              )}
              {uploadData && (
                <div className="space-y-3 text-sm bg-muted/40 p-4 rounded-lg border">
                  <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Name</span> <span className="font-medium truncate max-w-[150px]">{uploadData.originalName}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Size</span> <span className="font-medium">{formatSize(uploadData.size)}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">Resolution</span> <span className="font-medium">{uploadData.info.resolution}</span></div>
                  <div className="flex justify-between border-b pb-2"><span className="text-muted-foreground">FPS</span> <span className="font-medium">{uploadData.info.fps}</span></div>
                  <div className="flex justify-between pb-2"><span className="text-muted-foreground">Duration</span> <span className="font-medium">{(uploadData.info.duration).toFixed(1)}s</span></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <h3 className="text-xl font-bold">1. Select Target Platform</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {platforms.map(p => (
              <div 
                key={p.id} 
                className={`border-2 rounded-xl p-4 transition-all cursor-pointer ${selectedPlatform === p.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md ring-2 ring-primary-500 ring-offset-2' : `${p.color} bg-card`}`}
                onClick={() => setSelectedPlatform(p.id)}
              >
                <div className="flex flex-col h-full">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${selectedPlatform === p.id ? 'bg-primary-100 text-primary-600' : 'bg-muted'}`}>
                    <p.icon className="w-5 h-5" />
                  </div>
                  <h4 className="font-semibold">{p.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {selectedPlatform && (
            <div className="pt-6 border-t flex flex-col items-center">
              <h3 className="text-xl font-bold mb-4">2. Start Optimization</h3>
              <Button size="lg" className="w-full max-w-md h-14 text-lg" onClick={startOptimization}>
                <Sparkles className="w-5 h-5 mr-2" /> Optimize Now
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderProcessingState = () => (
    <Card className="max-w-2xl mx-auto border-primary-200 shadow-lg">
      <CardHeader className="text-center pb-2">
        <Loader2 className="w-12 h-12 text-primary-500 animate-spin mx-auto mb-4" />
        <CardTitle className="text-2xl">Optimizing your video...</CardTitle>
        <CardDescription>
          Our servers are working hard. This uses actual FFmpeg processing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8 pt-6">
        <div className="space-y-3">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-primary-600 dark:text-primary-400">
              {jobStatus?.status === 'pending' ? 'Initializing Engine...' : 'Encoding in Progress'}
            </span>
            <span>{jobStatus?.progress || 0}%</span>
          </div>
          <div className="w-full h-4 bg-muted rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-primary-500 transition-all duration-500 ease-out rounded-full relative overflow-hidden"
              style={{ width: `${jobStatus?.progress || 0}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Time Elapsed</p>
            <p className="text-2xl font-light font-mono">{formatTime(processingTime)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Target Platform</p>
            <p className="text-lg font-medium">{platforms.find(p => p.id === selectedPlatform)?.name}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderResultState = () => {
    if (!jobStatus?.result) return null;
    const { originalInfo, originalSize, optimizedInfo, optimizedSize, optimizedFileId } = jobStatus.result;
    const isAlreadyOptimized = jobStatus.result.alreadyOptimized;

    return (
      <div className="space-y-8 animate-in fade-in zoom-in-95">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold mb-2 text-green-600 dark:text-green-500">Optimization Complete!</h2>
          <p className="text-muted-foreground">
            {isAlreadyOptimized 
              ? "Good news! Your video was already perfect for this platform." 
              : `Successfully optimized for ${platforms.find(p => p.id === selectedPlatform)?.name} in ${formatTime(processingTime)}.`}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="overflow-hidden border-primary-100">
            <div className="w-full aspect-video bg-black relative">
              {/* Note: since it's a temp file on server, we can fetch it to object url, or just rely on direct endpoint */}
              <video src={`/api/optimizer/download/${optimizedFileId}`} className="w-full h-full object-contain" controls />
            </div>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center"><Sparkles className="w-5 h-5 mr-2 text-primary-500" /> Result Preview</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" className="flex-1" onClick={() => window.location.href = `/api/optimizer/download/${optimizedFileId}?download=true`}>
                  <Download className="w-5 h-5 mr-2" /> Download Optimized
                </Button>
                <Button size="lg" variant="outline" className="flex-1" onClick={() => window.location.href = `/api/optimizer/download/${uploadData?.fileId}?download=true`}>
                  Download Original
                </Button>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => setShowCompare(!showCompare)} className="flex-1">
                  <SplitSquareHorizontal className="w-4 h-4 mr-2" /> Compare Stats
                </Button>
                <Button variant="ghost" onClick={() => {
                  setJobStatus(null);
                  setSelectedPlatform(null);
                  setShowCompare(false);
                }} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" /> Optimize Again
                </Button>
              </div>
            </CardContent>
          </Card>

          {showCompare && (
            <Card className="animate-in slide-in-from-right-8 bg-muted/10">
              <CardHeader>
                <CardTitle>Detailed Comparison</CardTitle>
                <CardDescription>Before and after FFmpeg processing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* File Size Comparison */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">File Size</span>
                      <span className={optimizedSize < originalSize ? "text-green-500 font-bold" : ""}>
                        {optimizedSize < originalSize ? `-${Math.round((1 - optimizedSize/originalSize)*100)}%` : 'Similar'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-card border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Original</p>
                        <p className="font-mono">{formatSize(originalSize)}</p>
                      </div>
                      <div className="p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 rounded-lg">
                        <p className="text-xs text-primary-600 mb-1">Optimized</p>
                        <p className="font-mono text-primary-700 dark:text-primary-400">{formatSize(optimizedSize)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Resolution Comparison */}
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">Resolution</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-card border rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Original</p>
                        <p className="font-mono">{originalInfo.resolution}</p>
                      </div>
                      <div className="p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 rounded-lg">
                        <p className="text-xs text-primary-600 mb-1">Optimized</p>
                        <p className="font-mono text-primary-700 dark:text-primary-400">{optimizedInfo.resolution}</p>
                      </div>
                    </div>
                  </div>

                  {/* Other Stats */}
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">FPS</p>
                      <div className="flex items-center gap-2">
                        <span className="line-through opacity-50">{originalInfo.fps}</span>
                        <ArrowLeft className="w-3 h-3 rotate-180" />
                        <span className="font-bold">{optimizedInfo.fps}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Bitrate</p>
                      <div className="flex items-center gap-2">
                        <span className="line-through opacity-50">{formatBitrate(originalInfo.bitrate)}</span>
                        <ArrowLeft className="w-3 h-3 rotate-180" />
                        <span className="font-bold">{formatBitrate(optimizedInfo.bitrate)}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Codec</p>
                      <div className="flex items-center gap-2">
                        <span className="line-through opacity-50">{originalInfo.format}</span>
                        <ArrowLeft className="w-3 h-3 rotate-180" />
                        <span className="font-bold">{optimizedInfo.format}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Processing Time</p>
                      <p className="font-bold">{formatTime(processingTime)}</p>
                    </div>
                  </div>
                  
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="-ml-4 text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back Home
          </Button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">Social Video Optimizer</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Prepare your videos for any platform with pixel-perfect encoding. Powered by advanced FFmpeg compression technology.
          </p>
        </div>

        {/* State Machine */}
        {!uploadData && renderUploadState()}
        {uploadData && !jobStatus && renderConfigurationState()}
        {jobStatus && (jobStatus.status === 'processing' || jobStatus.status === 'pending') && renderProcessingState()}
        {jobStatus && jobStatus.status === 'completed' && renderResultState()}

      </div>
    </div>
  );
};
