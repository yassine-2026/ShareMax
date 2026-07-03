import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, File, X, Image as ImageIcon, Film, CheckCircle2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SmartVideoExport } from '@/components/SmartVideoExport';

interface UploadFile extends window.File {
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  id: string;
  driveId?: string;
}

export const Upload = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const { addToast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const xhrRefs = useRef<Record<string, XMLHttpRequest>>({});

  const onDrop = useCallback((acceptedFiles: window.File[]) => {
    const newFiles = acceptedFiles.map((file) => Object.assign(file, {
      preview: (file.type || '').startsWith('image/') ? URL.createObjectURL(file) : undefined,
      progress: 0,
      status: 'pending' as const,
      id: Math.random().toString(36).substring(7),
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleStartUploading = () => {
    try {
      const pendingFiles = files.filter(f => f.status === 'pending' || f.status === 'error');
      if (pendingFiles.length === 0) return;
      
      setIsUploading(true);

      pendingFiles.forEach((file) => {
        try {
          setFiles(prev => prev.map(f => f.id === file.id ? { ...f, status: 'uploading', progress: 0 } : f));
          const formData = new FormData();
          formData.append('files', file);

          const xhr = new XMLHttpRequest();
          xhrRefs.current[file.id] = xhr;
          xhr.open('POST', '/api/upload', true);
          xhr.withCredentials = true;

          xhr.upload.onprogress = (event) => {
            try {
              if (event.lengthComputable && event.total > 0) {
                const progress = (event.loaded / event.total) * 100;
                setFiles((prev) => prev.map((f) => 
                  f.id === file.id ? { ...f, progress } : f
                ));
              }
            } catch (err) {
              console.error('Progress event error:', err);
            }
          };

          xhr.onload = () => {
            try {
              if (xhr.status === 200) {
                let response;
                try {
                  response = JSON.parse(xhr.responseText);
                } catch (e) {
                  console.error('JSON parse error', e);
                  throw new Error('Invalid JSON response');
                }
                const uploadedFile = Array.isArray(response?.files) ? response.files.find((rf: any) => rf.name === file.name) : undefined;
                setFiles((prev) => prev.map((f) => 
                  f.id === file.id ? { ...f, progress: 100, status: 'completed', driveId: uploadedFile?.id } : f
                ));
                addToast(`${file.name} uploaded successfully`, 'success');
              } else {
                console.error('Upload failed with status', xhr.status, xhr.responseText);
                setFiles((prev) => prev.map((f) => 
                  f.id === file.id ? { ...f, status: 'error' } : f
                ));
                addToast(`Failed to upload ${file.name}`, 'error');
              }
            } catch (err) {
              console.error('onload error', err);
              setFiles((prev) => prev.map((f) => 
                f.id === file.id ? { ...f, status: 'error' } : f
              ));
              addToast(`Error processing upload response for ${file.name}`, 'error');
            } finally {
              delete xhrRefs.current[file.id];
              checkAllDone();
            }
          };

          xhr.onerror = () => {
            console.error('xhr.onerror triggered for file', file.name);
            setFiles((prev) => prev.map((f) => 
              f.id === file.id ? { ...f, status: 'error' } : f
            ));
            addToast(`Network error uploading ${file.name}`, 'error');
            delete xhrRefs.current[file.id];
            checkAllDone();
          };

          xhr.onabort = () => {
            console.log('xhr.onabort triggered for file', file.name);
            setFiles((prev) => prev.map((f) => 
              f.id === file.id ? { ...f, status: 'error' } : f
            ));
            delete xhrRefs.current[file.id];
            checkAllDone();
          };

          xhr.send(formData);
        } catch (error) {
          console.error('Error starting upload for file', file?.name, error);
          setFiles((prev) => prev.map((f) => 
            f.id === file.id ? { ...f, status: 'error' } : f
          ));
          addToast(`Failed to start upload for ${file?.name || 'file'}`, 'error');
          checkAllDone();
        }
      });
    } catch (e) {
      console.error('Fatal error in handleStartUploading', e);
      addToast('An unexpected error occurred while starting the upload', 'error');
      setIsUploading(false);
    }
  };

  const checkAllDone = () => {
    setFiles(prev => {
      const stillUploading = prev.some(f => f.status === 'uploading');
      if (!stillUploading) {
        setIsUploading(false);
      }
      return prev;
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop } as any);

  const removeFile = (id: string) => {
    if (xhrRefs.current[id]) {
      xhrRefs.current[id].abort();
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const totalSize = files.reduce((acc, file) => acc + (file.size || 0), 0);
  const formatSize = (bytes: number) => {
    if (!bytes || isNaN(bytes) || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) return null;

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Upload Media</h1>
          <p className="text-muted-foreground">Share photos and videos in their original, uncompressed quality.</p>
        </div>

        {!isAuthenticated ? (
          <Card className="border-2 border-dashed p-12 text-center bg-muted/30">
            <CardContent className="pt-6">
              <UploadCloud className="w-16 h-16 mx-auto text-muted-foreground mb-6" />
              <h3 className="text-xl font-semibold mb-4">Authentication Required</h3>
              <p className="text-muted-foreground mb-8">You need to sign in with your Google account to upload and save files directly to your Google Drive.</p>
              <Button size="lg" onClick={() => window.location.href = '/api/auth/google'}>
                Sign in with Google
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10' : 'border-border hover:border-primary-400 hover:bg-muted/50'}`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-16 h-16 mx-auto text-primary-500 mb-6" />
              <h3 className="text-xl font-semibold mb-2">Drag & drop your files here</h3>
              <p className="text-muted-foreground mb-6">or click to select files from your device</p>
              <Button>Browse Files</Button>
            </div>

            {files.length > 0 && (
              <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">Ready to upload {files.length} files</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">Total size: {formatSize(totalSize)}</span>
                    {files.some(f => f.status === 'pending' || f.status === 'error') && (
                      <Button onClick={handleStartUploading} disabled={isUploading}>
                        {isUploading ? 'Uploading...' : 'Upload Now'}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <AnimatePresence>
                    {files.map((file) => (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <Card className="overflow-hidden">
                          <CardContent className="p-0">
                            <div className="flex items-center p-4 gap-4">
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                                {file.preview ? (
                                  <img src={file.preview} alt="preview" className="w-full h-full object-cover" />
                                ) : (file.type || '').startsWith('video/') ? (
                                  <Film className="w-8 h-8 text-muted-foreground" />
                                ) : (
                                  <File className="w-8 h-8 text-muted-foreground" />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <p className="text-sm font-medium truncate pr-4">{file.name}</p>
                                  {file.status !== 'uploading' && (
                                    <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-red-500 flex-shrink-0">
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-300 ${file.status === 'completed' ? 'bg-green-500' : file.status === 'error' ? 'bg-red-500' : 'bg-primary-500'}`}
                                      style={{ width: `${file.progress}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground w-12 text-right">
                                    {Math.round(file.progress || 0)}%
                                  </span>
                                </div>
                                
                                <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
                                  <span>{formatSize(file.size)}</span>
                                  {file.status === 'completed' && file.driveId && (
                                    <div className="flex items-center gap-3">
                                      <span className="text-green-500 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Completed
                                      </span>
                                      <div className="h-3 w-px bg-border" />
                                      <Button variant="link" className="h-auto p-0 text-primary-600" onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/share/${file.driveId}`);
                                        addToast('Link copied to clipboard', 'success');
                                      }}>
                                        Copy Link
                                      </Button>
                                      <div className="h-3 w-px bg-border" />
                                      <a href={`/share/${file.driveId}`} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                                        Open File
                                      </a>
                                      <div className="h-3 w-px bg-border" />
                                      <a href={`/api/files/${file.driveId}/stream`} target="_blank" rel="noreferrer" download className="text-primary-600 hover:underline flex items-center gap-1">
                                        <Download className="w-3 h-3" /> Download Original
                                      </a>
                                    </div>
                                  )}
                                  {file.status === 'error' && (
                                    <span className="text-red-500 flex items-center gap-1">
                                      <X className="w-3 h-3" /> Error
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* Smart Video Export Assistant */}
                            {file.status === 'completed' && file.driveId && file.type?.startsWith('video/') && (
                              <div className="px-4 pb-4">
                                <SmartVideoExport fileId={file.driveId} fileName={file.name} />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};
