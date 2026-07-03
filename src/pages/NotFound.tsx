import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FileQuestion } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6 text-muted-foreground">
          <FileQuestion className="w-10 h-10" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">404 - Not Found</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
          The page or file you are looking for doesn't exist, has been removed, or is temporarily unavailable.
        </p>
        <Link to="/">
          <Button size="lg">Return to Homepage</Button>
        </Link>
      </div>
    </div>
  );
};
