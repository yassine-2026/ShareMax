import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Video, UploadCloud, Sparkles, Loader2, CheckCircle2, AlertCircle, SplitSquareHorizontal, Download, ArrowLeft, RefreshCw, Twitter, Linkedin, Facebook, MessageCircle, Send, Archive } from 'lucide-react';
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
  jobId?: string;
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
  
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [jobs, setJobs] = useState<Record<string, JobStatus>>({});
  const [showCompare, setShowCompare] = useState<Record<string, boolean>>({});
  const [processingTime, setProcessingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);

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
    setSelectedPlatforms([]);
    setJobs({});
    setShowCompare({});
    setIsProcessing(false);
    
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

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedPlatforms(platforms.map(p => p.id));
  };

  const clearSelection = () => {
    setSelectedPlatforms([]);
  };

  const startOptimization = async () => {
    if (!uploadData || selectedPlatforms.length === 0) return;
    
    setIsProcessing(true);
    const initialJobs: Record<string, JobStatus> = {};
    selectedPlatforms.forEach(p => {
      initialJobs[p] = { status: 'pending', progress: 0 };
    });
    setJobs(initialJobs);
    
    setProcessingTime(0);
    timerRef.current = setInterval(() => {
      setProcessingTime(prev => prev + 1);
    }, 1000);

    // Start all jobs concurrently
    for (const platform of selectedPlatforms) {
      startJobForPlatform(platform);
    }
  };

  const startJobForPlatform = async (platform: string) => {
    try {
      const res = await fetch('/api/optimizer/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: uploadData!.fileId, platform })
      });
      
      if (!res.ok) {
        throw new Error('Failed to start');
      }
      
      const { jobId } = await res.json();
      setJobs(prev => ({
        ...prev,
        [platform]: { ...prev[platform], jobId, status: 'processing' }
      }));
    } catch (err: any) {
      console.error(`Process error for ${platform}:`, err);
      setJobs(prev => ({
        ...prev,
        [platform]: { status: 'error', progress: 0, error: err.message || 'Error starting job' }
      }));
    }
  };

  useEffect(() => {
    const activeJobs =  ( (Object.entries(jobs) as [string, JobStatus][]) as [string, JobStatus][]).filter(([_, j]) => (j.status === 'processing' || j.status === 'pending') && j.jobId);
    if (activeJobs.length === 0) {
      if (isProcessing) {
        // All finished
        if (timerRef.current) clearInterval(timerRef.current);
      }
      return;
    }

    const interval = setInterval(() => {
      activeJobs.forEach(async ([platform, job]) => {
        try {
          const res = await fetch('/api/video/job/' + job.jobId);
          if (!res.ok) return;
          const data = await res.json();
          setJobs(prev => ({
            ...prev,
            [platform]: { ...prev[platform], ...data }
          }));
        } catch (err) {
          console.error('Status check error', err);
        }
      });
    }, 1500);
    
    return () => clearInterval(interval);
  }, [jobs, isProcessing]);

  const handleDownloadAll = async () => {
    setDownloadingZip(true);
    try {
      const filesToZip =  (Object.entries(jobs) as [string, JobStatus][])
        .filter(([_, job]) => job.status === 'completed' && job.result)
        .map(([platformId, job]) => {
          const platformName = platforms.find(p => p.id === platformId)?.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || platformId;
          const ext = job.result!.optimizedFileId.split('.').pop() || 'mp4';
          return {
            fileId: job.result!.optimizedFileId,
            name: `${platformName}_optimized.${ext}`
          };
        });

      if (filesToZip.length === 0) {
        addToast('No completed files to download', 'error');
        return;
      }

      const res = await fetch('/api/optimizer/prepare-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: filesToZip })
      });

      if (!res.ok) throw new Error('Failed to prepare ZIP');
      const { zipId } = await res.json();
      
      window.location.href = `/api/optimizer/download-zip/${zipId}`;
      addToast('Downloading ZIP archive...', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to download ZIP', 'error');
    } finally {
      setDownloadingZip(false);
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
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Select Target Platforms</h3>
            <div className="space-x-2 text-sm">
              <button onClick={selectAll} className="text-primary-600 hover:underline">Select All</button>
              <span className="text-muted-foreground">|</span>
              <button onClick={clearSelection} className="text-primary-600 hover:underline">Clear</button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {platforms.map(p => {
              const isSelected = selectedPlatforms.includes(p.id);
              return (
                <div 
                  key={p.id} 
                  className={`border-2 rounded-xl p-4 transition-all cursor-pointer relative ${isSelected ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-md ring-2 ring-primary-500 ring-offset-2' : `${p.color} bg-card`}`}
                  onClick={() => togglePlatform(p.id)}
                >
                  <div className="absolute top-4 right-4">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-muted-foreground/30'}`}>
                      {isSelected && <CheckCircle2 className="w-3 h-3" />}
                    </div>
                  </div>
                  <div className="flex flex-col h-full">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${isSelected ? 'bg-primary-100 text-primary-600' : 'bg-muted'}`}>
                      <p.icon className="w-5 h-5" />
                    </div>
                    <h4 className="font-semibold">{p.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-6 border-t flex flex-col items-center">
            <Button 
              size="lg" 
              className="w-full max-w-md h-14 text-lg" 
              onClick={startOptimization}
              disabled={selectedPlatforms.length === 0}
            >
              <Sparkles className="w-5 h-5 mr-2" /> 
              Optimize for {selectedPlatforms.length} {selectedPlatforms.length === 1 ? 'Platform' : 'Platforms'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const allDone =  (Object.values(jobs) as JobStatus[]).length > 0 &&  (Object.values(jobs) as JobStatus[]).every(j => j.status === 'completed' || j.status === 'error');
  const someCompleted =  (Object.values(jobs) as JobStatus[]).some(j => j.status === 'completed');

  const renderJobsState = () => {
    return (
      <div className="space-y-8 animate-in fade-in zoom-in-95">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            {!allDone ? (
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            ) : (
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            )}
            <h2 className="text-3xl font-bold">
              {!allDone ? 'Optimizing Videos...' : 'Optimization Complete!'}
            </h2>
          </div>
          <p className="text-muted-foreground">
            {!allDone ? `Processing ${selectedPlatforms.length} platforms asynchronously. Time elapsed: ${formatTime(processingTime)}` : 'All tasks have finished processing.'}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {selectedPlatforms.map(platformId => {
            const platform = platforms.find(p => p.id === platformId)!;
            const job = jobs[platformId];
            if (!job) return null;

            return (
              <Card key={platformId} className={`overflow-hidden transition-all duration-500 ${job.status === 'completed' ? 'border-green-200' : job.status === 'error' ? 'border-red-200' : 'border-primary-200'}`}>
                <div className="flex flex-col md:flex-row h-full">
                  
                  {/* Left Side: Status & Video Preview */}
                  <div className="w-full md:w-1/3 bg-muted/30 border-r flex flex-col">
                    <div className="p-4 flex items-center border-b bg-card">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${job.status === 'completed' ? 'bg-green-100 text-green-600' : job.status === 'error' ? 'bg-red-100 text-red-600' : 'bg-primary-100 text-primary-600'}`}>
                        <platform.icon className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold flex-1">{platform.name}</h4>
                      {job.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                      {job.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
                      {(job.status === 'processing' || job.status === 'pending') && <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />}
                    </div>
                    
                    <div className="flex-1 min-h-[200px] relative bg-black flex items-center justify-center">
                      {job.status === 'completed' && job.result ? (
                        <video src={`/api/optimizer/download/${job.result.optimizedFileId}`} className="w-full h-full object-contain absolute inset-0" controls />
                      ) : (
                        <div className="text-center p-6 text-muted-foreground w-full">
                          {job.status === 'error' ? (
                            <div className="text-red-400">
                              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">{job.error}</p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <Loader2 className="w-8 h-8 mx-auto mb-2 opacity-50 animate-spin" />
                              <div className="w-full max-w-[200px] h-2 bg-white/10 rounded-full mx-auto overflow-hidden">
                                <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${job.progress}%` }} />
                              </div>
                              <p className="text-sm font-mono">{job.progress}%</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side: Details & Actions */}
                  <div className="w-full md:w-2/3 flex flex-col">
                    <CardContent className="p-6 flex-1">
                      {job.status === 'completed' && job.result ? (
                        <div className="space-y-6">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-muted/50 p-3 rounded-lg border">
                              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Resolution</p>
                              <p className="font-mono text-sm">{job.result.optimizedInfo.resolution}</p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg border">
                              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">FPS</p>
                              <p className="font-mono text-sm">{job.result.optimizedInfo.fps}</p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg border">
                              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Bitrate</p>
                              <p className="font-mono text-sm">{formatBitrate(job.result.optimizedInfo.bitrate)}</p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg border">
                              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Size</p>
                              <p className="font-mono text-sm font-bold text-primary-600 dark:text-primary-400">{formatSize(job.result.optimizedSize)}</p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg border">
                              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Codec</p>
                              <p className="font-mono text-sm">{job.result.optimizedInfo.format}</p>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-lg border">
                              <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Time</p>
                              <p className="font-mono text-sm">{job.result.alreadyOptimized ? 'Instant' : formatTime(processingTime)}</p>
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap gap-3">
                            <Button size="sm" onClick={() => window.location.href = `/api/optimizer/download/${job.result!.optimizedFileId}?download=true`}>
                              <Download className="w-4 h-4 mr-2" /> Download
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowCompare(prev => ({ ...prev, [platformId]: !prev[platformId] }))}>
                              <SplitSquareHorizontal className="w-4 h-4 mr-2" /> Compare
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => {
                              const url = `${window.location.origin}/api/optimizer/download/${job.result!.optimizedFileId}?download=true`;
                              navigator.clipboard.writeText(url);
                              addToast('Link copied!', 'success');
                            }}>
                              Copy Link
                            </Button>
                          </div>

                          {showCompare[platformId] && (
                            <div className="mt-4 p-4 bg-muted/20 border rounded-lg animate-in slide-in-from-top-2">
                              <h5 className="font-semibold text-sm mb-3">Original vs Optimized</h5>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground mb-1">Original Size</p>
                                  <p className="font-mono">{formatSize(job.result.originalSize)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Optimized Size</p>
                                  <p className="font-mono text-primary-600 font-bold">{formatSize(job.result.optimizedSize)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Original Res</p>
                                  <p className="font-mono">{job.result.originalInfo.resolution}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Optimized Res</p>
                                  <p className="font-mono">{job.result.optimizedInfo.resolution}</p>
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                          {job.status === 'error' ? (
                            <div className="text-red-500">
                              <p className="font-semibold mb-2">Optimization Failed</p>
                              <Button size="sm" variant="outline" onClick={() => startJobForPlatform(platformId)}>Retry</Button>
                            </div>
                          ) : (
                            <div className="text-muted-foreground">
                              <p className="mb-2">Processing video with FFmpeg...</p>
                              <p className="text-xs">Applying specific encoding rules for {platform.name}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        
        {allDone && someCompleted && (
          <div className="mt-12 text-center pb-12">
            <Button size="lg" className="h-16 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all" onClick={handleDownloadAll} disabled={downloadingZip}>
              {downloadingZip ? <Loader2 className="w-6 h-6 mr-3 animate-spin" /> : <Archive className="w-6 h-6 mr-3" />}
              {downloadingZip ? 'Preparing ZIP Archive...' : 'Download All as ZIP'}
            </Button>
            <div className="mt-6">
              <Button variant="ghost" onClick={() => {
                setJobs({});
                setSelectedPlatforms([]);
                setIsProcessing(false);
              }}>
                <RefreshCw className="w-4 h-4 mr-2" /> Start Over
              </Button>
            </div>
          </div>
        )}
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
        {uploadData && !isProcessing && renderConfigurationState()}
        {isProcessing && renderJobsState()}

      </div>
    </div>
  );
};
