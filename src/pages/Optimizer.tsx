import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Check, Zap, Play, Download, Settings as SettingsIcon, AlertCircle, FileArchive } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/Button';

interface VideoMetadata {
  resolution: string;
  fps: string;
  codec: string;
  bitrate: string;
  container: string;
  pixelFormat: string;
  audioCodec: string;
  audioBitrate: string;
  sampleRate: string;
  fileSize: string;
  duration: string;
  appliedSettings?: {
    preset: string | number;
    crf: string | number;
    videoBitrate: string;
    audioBitrate: string;
    container: string;
  };
}

interface PlatformState {
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  elapsedTime: string;
  remainingTime: string;
  error?: string;
  message?: string;
  resultMetadata?: VideoMetadata;
}

const PLATFORMS = [
  'TikTok',
  'Instagram Reels',
  'Facebook',
  'YouTube Shorts',
  'WhatsApp',
  'Telegram',
  'X',
  'Snapchat',
  'LinkedIn'
];

export const Optimizer = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [jobState, setJobState] = useState<Record<string, PlatformState>>({});
  
  const [showComparison, setShowComparison] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setError(null);
      setJobId(null);
      setMetadata(null);
      setJobState({});
      setIsOptimizing(false);
      handleUpload(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': [],
      'image/*': []
    },
    maxFiles: 1
  } as any);

  const handleUpload = async (uploadFile: File) => {
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', uploadFile);

    try {
      const res = await fetch('/api/optimize/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload file');
      
      setJobId(data.jobId);
      setMetadata(data.metadata);
    } catch (err: any) {
      setError(err.message);
      setFile(null);
    } finally {
      setIsUploading(false);
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const startOptimization = async () => {
    if (!jobId || selectedPlatforms.length === 0) return;
    
    setIsOptimizing(true);
    setError(null);
    
    try {
      const res = await fetch('/api/optimize/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, platforms: selectedPlatforms })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start optimization');
      
      connectSSE();
    } catch (err: any) {
      setError(err.message);
      setIsOptimizing(false);
    }
  };

  const connectSSE = () => {
    if (!jobId) return;
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    const es = new EventSource(`/api/optimize/progress/${jobId}`);
    eventSourceRef.current = es;
    
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setJobState(data);
        
        // Check if all selected platforms are completed or error
        let allDone = true;
        for (const p of selectedPlatforms) {
          if (!data[p] || (data[p].status !== 'completed' && data[p].status !== 'error')) {
            allDone = false;
            break;
          }
        }
        
        if (allDone) {
          es.close();
          setIsOptimizing(false);
        }
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    };
    
    es.onerror = (err) => {
      console.error('SSE Error', err);
      es.close();
    };
  };

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const downloadAll = () => {
    if (jobId) {
      window.location.href = `/api/optimize/download-all/${jobId}`;
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Apple Quality Optimizer</h1>
        <p className="text-lg text-muted-foreground">
          تم تحسين الفيديو باستخدام إعدادات احترافية متوافقة مع المنصة المختارة لزيادة فرص الحفاظ على أعلى جودة ممكنة عند النشر.
        </p>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center border border-destructive/20">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!metadata && !isUploading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border-2 border-dashed rounded-2xl p-12 text-center transition-colors"
          {...(getRootProps() as any)}
          style={{ borderColor: isDragActive ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}
        >
          <input {...getInputProps()} />
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
            <Upload className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Drag & Drop your video or image here</h3>
          <p className="text-muted-foreground mb-6">Or click to select a file from your device</p>
          <Button size="lg">Choose File</Button>
        </motion.div>
      )}

      {isUploading && (
        <div className="bg-card border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h3 className="text-xl font-semibold">Analyzing Media...</h3>
          <p className="text-muted-foreground mt-2">Extracting true metadata using FFprobe</p>
        </div>
      )}

      {metadata && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
                <div className="aspect-video bg-black relative">
                  {jobId && (
                    <video 
                      src={`/api/optimize/stream/${jobId}`} 
                      controls 
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="p-4 bg-muted/30 border-t">
                  <h4 className="font-medium mb-1">Original Video</h4>
                  <p className="text-xs text-muted-foreground truncate">{file?.name}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="bg-card border rounded-2xl p-6 shadow-sm">
                <div className="flex items-center mb-6">
                  <SettingsIcon className="w-5 h-5 mr-2 text-primary" />
                  <h3 className="text-lg font-semibold">Source Metadata</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <MetaItem label="Resolution" value={metadata.resolution} />
                  <MetaItem label="FPS" value={metadata.fps} />
                  <MetaItem label="Codec" value={metadata.codec} />
                  <MetaItem label="Bitrate" value={metadata.bitrate} />
                  <MetaItem label="Container" value={metadata.container} />
                  <MetaItem label="Pixel Format" value={metadata.pixelFormat} />
                  <MetaItem label="Audio Codec" value={metadata.audioCodec} />
                  <MetaItem label="Audio Bitrate" value={metadata.audioBitrate} />
                  <MetaItem label="Sample Rate" value={metadata.sampleRate} />
                  <MetaItem label="File Size" value={metadata.fileSize} />
                  <MetaItem label="Duration" value={metadata.duration} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-2xl p-8 shadow-sm">
            <h3 className="text-xl font-semibold mb-6">Select Target Platforms</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              {PLATFORMS.map(platform => {
                const isSelected = selectedPlatforms.includes(platform);
                return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    disabled={isOptimizing || Object.keys(jobState).length > 0}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 text-primary-foreground' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className={`font-medium ${isSelected ? 'text-primary' : ''}`}>{platform}</span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                      isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground'
                    }`}>
                      {isSelected && <Check className="w-3 h-3" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {Object.keys(jobState).length === 0 && (
              <Button 
                size="lg" 
                className="w-full h-16 text-xl" 
                disabled={selectedPlatforms.length === 0}
                onClick={startOptimization}
              >
                <Zap className="w-6 h-6 mr-2" />
                Optimize Now
              </Button>
            )}
          </div>

          {Object.keys(jobState).length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold tracking-tight">Optimization Results</h3>
                {!isOptimizing && (
                  <Button onClick={downloadAll} variant="default" className="bg-primary text-primary-foreground">
                    <FileArchive className="w-4 h-4 mr-2" />
                    Download All (ZIP)
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedPlatforms.map(platform => {
                  const state = jobState[platform];
                  if (!state) return null;
                  
                  return (
                    <div key={platform} className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xl font-bold">{platform}</h4>
                        {state.status === 'completed' && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-semibold rounded-full">Ready</span>
                        )}
                        {state.status === 'processing' && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-semibold rounded-full animate-pulse">Processing</span>
                        )}
                        {state.status === 'error' && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold rounded-full">Error</span>
                        )}
                      </div>

                      {state.status === 'processing' && (
                        <div className="space-y-4 flex-grow">
                          <div className="w-full bg-secondary h-3 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300 ease-out" 
                              style={{ width: `${state.progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>{state.progress}% Complete</span>
                            <span>Remaining: {state.remainingTime}</span>
                          </div>
                          <div className="text-xs text-muted-foreground text-center">
                            Elapsed: {state.elapsedTime}
                          </div>
                        </div>
                      )}

                      {state.status === 'error' && (
                        <div className="text-destructive text-sm flex-grow">
                          Error: {state.error}
                        </div>
                      )}

                      {state.status === 'completed' && state.resultMetadata && (
                        <div className="flex-grow space-y-6">
                          {state.message && (
                            <div className="bg-primary/10 text-primary text-sm p-3 rounded-lg font-medium border border-primary/20">
                              {state.message}
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <ResultMeta label="Resolution" value={state.resultMetadata.resolution} />
                            <ResultMeta label="FPS" value={state.resultMetadata.fps} />
                            <ResultMeta label="Codec" value={state.resultMetadata.codec} />
                            <ResultMeta label="Size" value={state.resultMetadata.fileSize} />
                          </div>
                          
                          {state.resultMetadata.appliedSettings && (
                            <div className="pt-4 border-t border-border/50">
                              <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Applied Settings</h5>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <ResultMeta label="Target Video Bitrate" value={state.resultMetadata.appliedSettings.videoBitrate} />
                                <ResultMeta label="Target Audio Bitrate" value={state.resultMetadata.appliedSettings.audioBitrate} />
                                <ResultMeta label="CRF" value={String(state.resultMetadata.appliedSettings.crf)} />
                                <ResultMeta label="Preset" value={String(state.resultMetadata.appliedSettings.preset)} />
                              </div>
                            </div>
                          )}
                          
                          <div className="flex gap-3 mt-auto pt-4 border-t">
                            <Button 
                              className="flex-1"
                              onClick={() => window.location.href = `/api/optimize/download/${jobId}/${platform}`}
                            >
                              <Download className="w-4 h-4 mr-2" /> Download
                            </Button>
                            <Button 
                              variant="outline"
                              className="flex-1"
                              onClick={() => setShowComparison(platform)}
                            >
                              Compare
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Comparison Modal */}
      <AnimatePresence>
        {showComparison && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border shadow-xl rounded-2xl w-full max-w-3xl overflow-hidden relative"
            >
              <button 
                onClick={() => setShowComparison(null)}
                className="absolute top-4 right-4 p-2 bg-muted hover:bg-muted-foreground/20 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="p-6 border-b">
                <h3 className="text-2xl font-bold">Compare: Original vs {showComparison}</h3>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="font-semibold text-muted-foreground">Property</div>
                  <div className="font-bold">Original</div>
                  <div className="font-bold text-primary">{showComparison}</div>
                  
                  <CompareRow label="Resolution" orig={metadata?.resolution} opt={jobState[showComparison]?.resultMetadata?.resolution} />
                  <CompareRow label="FPS" orig={metadata?.fps} opt={jobState[showComparison]?.resultMetadata?.fps} />
                  <CompareRow label="Video Codec" orig={metadata?.codec} opt={jobState[showComparison]?.resultMetadata?.codec} />
                  <CompareRow label="Bitrate" orig={metadata?.bitrate} opt={jobState[showComparison]?.resultMetadata?.bitrate} />
                  <CompareRow label="Audio Codec" orig={metadata?.audioCodec} opt={jobState[showComparison]?.resultMetadata?.audioCodec} />
                  <CompareRow label="Pixel Format" orig={metadata?.pixelFormat} opt={jobState[showComparison]?.resultMetadata?.pixelFormat} />
                  <CompareRow label="File Size" orig={metadata?.fileSize} opt={jobState[showComparison]?.resultMetadata?.fileSize} />
                  
                  {jobState[showComparison]?.resultMetadata?.appliedSettings && (
                    <>
                      <div className="col-span-3 mt-4 mb-2">
                        <h4 className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b pb-2">FFmpeg Profile Used</h4>
                      </div>
                      <CompareRow label="Target Preset" orig="-" opt={String(jobState[showComparison]?.resultMetadata?.appliedSettings?.preset)} />
                      <CompareRow label="Target CRF" orig="-" opt={String(jobState[showComparison]?.resultMetadata?.appliedSettings?.crf)} />
                      <CompareRow label="Video Target Bitrate" orig="-" opt={jobState[showComparison]?.resultMetadata?.appliedSettings?.videoBitrate} />
                      <CompareRow label="Container" orig="-" opt={jobState[showComparison]?.resultMetadata?.appliedSettings?.container} />
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MetaItem = ({ label, value }: { label: string, value: string }) => (
  <div className="bg-background rounded-lg p-3 border">
    <div className="text-xs text-muted-foreground mb-1">{label}</div>
    <div className="font-medium truncate" title={value}>{value}</div>
  </div>
);

const ResultMeta = ({ label, value }: { label: string, value: string }) => (
  <div>
    <span className="text-muted-foreground text-xs block">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
);

const CompareRow = ({ label, orig, opt }: { label: string, orig?: string, opt?: string }) => (
  <>
    <div className="text-sm text-muted-foreground py-2 border-t">{label}</div>
    <div className="text-sm font-medium py-2 border-t">{orig || '-'}</div>
    <div className="text-sm font-bold text-primary py-2 border-t">{opt || '-'}</div>
  </>
);
