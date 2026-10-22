'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface FoodImageProps {
  src?: string;
  alt: string;
  className?: string;
  /** emoji shown when there is no photo or it fails to load */
  icon?: string;
}

/** A dish photo that falls back to a tidy placeholder if the link is empty or broken. */
export function FoodImage({ src, alt, className, icon = '🍽️' }: FoodImageProps) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => setFailed(!src), [src]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn('flex items-center justify-center bg-gradient-to-br from-primary/10 via-accent to-secondary', className)}
      >
        <span className="text-3xl leading-none opacity-80">{icon}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={className} />
  );
}
