import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Download, Link as LinkIcon, Share2, QrCode, Trash2, Edit2, Play, Pause, Maximize, ZoomIn, ZoomOut, MoreVertical } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export const FileView = () => {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileData, setFileData] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated && id) {
      fetch(`/api/files/${id}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.file) {
            setFileData(data.file);
          } else {
            addToast('File not found', 'error');
          }
        })
        .catch(err => {
          console.error(err);
          addToast('Failed to load file', 'error');
        });
    }
  }, [id, isAuthenticated, addToast]);

  const handleCopyLink = () => {
    if (fileData?.webViewLink) {
      navigator.clipboard.writeText(fileData.webViewLink);
      addToast('Drive link copied to clipboard', 'success');
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast('Link copied to clipboard', 'success');
    }
  };

  const handleDownload = () => {
    if (fileData?.webContentLink) {
      window.open(fileData.webContentLink, '_blank');
    } else {
      window.open(`/api/files/${id}/stream`, '_blank');
    }
    addToast('Starting download...', 'info');
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this file?')) {
      fetch(`/api/files/${id}`, { method: 'DELETE', credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            addToast('File deleted successfully', 'success');
            window.location.href = '/dashboard';
          }
        })
        .catch(err => {
          console.error(err);
          addToast('Failed to delete file', 'error');
        });
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" />;
  if (!fileData) return <div className="p-8 text-center">Loading...</div>;

  const isImage = fileData.mimeType?.startsWith('image/');
  const mediaUrl = `/api/files/${id}/stream`;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Media Viewer */}
        <div className="lg:w-2/3 xl:w-3/4 flex flex-col">
          <div className="bg-muted/30 rounded-2xl border overflow-hidden relative flex items-center justify-center min-h-[500px] max-h-[800px]">
            {isImage ? (
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center group">
                <img 
                  src={mediaUrl} 
                  alt={fileData.name} 
                  className="max-w-full max-h-full object-contain transition-transform duration-300"
                  style={{ transform: `scale(${zoom})` }}
                  crossOrigin="anonymous"
                />
                
                {/* Controls Overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-background/80 backdrop-blur-md px-4 py-2 rounded-full border shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setZoom(Math.min(3, zoom + 0.25))}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                  <div className="w-px h-4 bg-border mx-1" />
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setZoom(1)}>
                    <Maximize className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full bg-black flex items-center justify-center group">
                <video 
                  src={mediaUrl}
                  controls
                  className="max-w-full max-h-full"
                  crossOrigin="anonymous"
                />
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="lg:w-1/3 xl:w-1/4 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-2 break-all">{fileData.name}</h1>
            <p className="text-sm text-muted-foreground">Uploaded on {new Date(fileData.createdTime).toLocaleDateString()}</p>
          </div>

          <div className="flex flex-col gap-3">
            <Button size="lg" className="w-full gap-2" onClick={handleDownload}>
              <Download className="w-5 h-5" /> Download Original
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={handleCopyLink}>
                <LinkIcon className="w-4 h-4" /> Copy Link
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={() => setIsQRModalOpen(true)}>
                <QrCode className="w-4 h-4" /> QR Code
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm border-b pb-2">File Details</h3>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <div className="text-muted-foreground">Type</div>
                <div className="font-medium capitalize">{fileData.mimeType?.split('/')[1] || 'Unknown'}</div>
                
                <div className="text-muted-foreground">Size</div>
                <div className="font-medium">{formatSize(parseInt(fileData.size || '0'))}</div>
                
                <div className="text-muted-foreground">Views</div>
                <div className="font-medium">0</div>
                
                <div className="text-muted-foreground">Downloads</div>
                <div className="font-medium">0</div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end border-t pt-6">
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {isQRModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border rounded-2xl shadow-xl max-w-sm w-full p-6"
            >
              <div className="text-center mb-6">
                <h3 className="text-lg font-bold">Share via QR Code</h3>
                <p className="text-sm text-muted-foreground">Scan to view this file on mobile</p>
              </div>
              <div className="flex justify-center mb-6 p-4 bg-white rounded-xl mx-auto w-max">
                <QRCodeSVG value={fileData.webViewLink || window.location.href} size={200} level="H" />
              </div>
              <Button className="w-full" variant="outline" onClick={() => setIsQRModalOpen(false)}>
                Close
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
