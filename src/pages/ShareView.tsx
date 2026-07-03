import React from 'react';
import { useParams } from 'react-router-dom';
import { Download, File as FileIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useToast } from "@/context/ToastContext";
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const ShareView = () => {
  const { id } = useParams<{ id: string }>();
const { addToast } = useToast();

  if (!id) return <div className="text-center p-8">Invalid link</div>;

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-12 max-w-5xl flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-8">Shared File</h1>
        
        {/* Responsive container for the iframe preview */}
        <div className="w-full aspect-video bg-muted/30 rounded-2xl overflow-hidden border border-border shadow-lg relative mb-8">
          <iframe 
            src={`https://drive.google.com/file/d/${id}/preview`} 
            className="w-full h-full absolute inset-0 border-0 bg-black"
            allow="autoplay"
          ></iframe>
        </div>

        <Button 
          size="lg" 
          className="w-full md:w-auto px-12 h-14 text-lg gap-3"
          onClick={() => {
            window.location.href = `https://drive.google.com/uc?export=download&id=${id}`;
            addToast("Download started", "success");
          }}
        >
          <Download className="w-6 h-6" />
          Download Original File
        </Button>
      </div>
    </ErrorBoundary>
  );
};
