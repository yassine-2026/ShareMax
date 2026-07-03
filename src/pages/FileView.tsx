import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Link as LinkIcon, Share2, QrCode, Trash2, Edit2, Play, Pause, Maximize, ZoomIn, ZoomOut, MoreVertical } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'motion/react';

// Mock Data
const mockFile = {
  id: '123',
  name: 'landscape_photography_iceland.jpg',
  type: 'image', // 'image' or 'video'
  size: '14.2 MB',
  date: '2023-10-15T14:23:00Z',
  views: 1245,
  downloads: 342,
  url: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?ixlib=rb-4.0.3&auto=format&fit=crop&w=2400&q=80',
  resolution: '6000 x 4000',
  camera: 'Sony A7IV',
};

export const FileView = () => {
  const { id } = useParams<{ id: string }>();
  const { addToast } = useToast();
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('Link copied to clipboard', 'success');
  };

  const handleDownload = () => {
    addToast('Starting download...', 'info');
  };

  const handleDelete = () => {
    addToast('File moved to trash', 'warning');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Media Viewer */}
        <div className="lg:w-2/3 xl:w-3/4 flex flex-col">
          <div className="bg-muted/30 rounded-2xl border overflow-hidden relative flex items-center justify-center min-h-[500px] max-h-[800px]">
            {mockFile.type === 'image' ? (
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center group">
                <img 
                  src={mockFile.url} 
                  alt={mockFile.name} 
                  className="max-w-full max-h-full object-contain transition-transform duration-300"
                  style={{ transform: `scale(${zoom})` }}
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
                {/* Mock Video Player */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button variant="ghost" size="icon" className="w-16 h-16 rounded-full bg-black/50 text-white hover:bg-primary-600 hover:text-white transition-all" onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                  </Button>
                </div>
                {/* Video controls mock */}
                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                   <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer">
                      <div className="h-full bg-primary-500 w-1/3" />
                   </div>
                   <div className="flex items-center justify-between text-white">
                      <div className="flex items-center gap-4 text-sm">
                        <button onClick={() => setIsPlaying(!isPlaying)}>
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </button>
                        <span>01:23 / 04:56</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <select className="bg-transparent text-sm outline-none cursor-pointer">
                          <option className="text-black">1.0x</option>
                          <option className="text-black">1.5x</option>
                          <option className="text-black">2.0x</option>
                        </select>
                        <button><Maximize className="w-4 h-4" /></button>
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Panel */}
        <div className="lg:w-1/3 xl:w-1/4 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-2 break-all">{mockFile.name}</h1>
            <p className="text-sm text-muted-foreground">Uploaded on {new Date(mockFile.date).toLocaleDateString()}</p>
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
                <div className="font-medium capitalize">{mockFile.type}</div>
                
                <div className="text-muted-foreground">Size</div>
                <div className="font-medium">{mockFile.size}</div>
                
                <div className="text-muted-foreground">Views</div>
                <div className="font-medium">{mockFile.views.toLocaleString()}</div>
                
                <div className="text-muted-foreground">Downloads</div>
                <div className="font-medium">{mockFile.downloads.toLocaleString()}</div>
                
                {mockFile.resolution && (
                  <>
                    <div className="text-muted-foreground">Resolution</div>
                    <div className="font-medium">{mockFile.resolution}</div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-2 justify-end border-t pt-6">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Edit2 className="w-4 h-4 mr-2" /> Edit
            </Button>
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
                <QRCodeSVG value={window.location.href} size={200} level="H" />
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
