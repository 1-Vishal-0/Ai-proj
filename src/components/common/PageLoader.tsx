import React from 'react';
import { PageSkeleton } from '../ui/Skeleton';

interface PageLoaderProps {
  message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ message }) => {
  return (
    <div aria-busy="true" aria-label={message || 'Loading content'}>
      <PageSkeleton />
    </div>
  );
};
