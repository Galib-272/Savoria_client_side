'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface FoodImageProps {
  src?: string;
  alt: string;
  className?: string;
  /** emoji shown when no photo works */
  icon?: string;
  /** other photos to try, in order, if `src` is empty or broken */
  fallbacks?: (string | undefined)[];
}

/** A dish photo that tries backup photos, then a tidy placeholder, if a link is empty or broken. */
export function FoodImage({ src, alt, className, icon = '🍽️', fallbacks = [] }: FoodImageProps) {
  const fallbackKey = fallbacks.join('|');
  const candidates = useMemo(
    () => Array.from(new Set([src, ...fallbacks].filter((u): u is string => !!u && u.trim() !== ''))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [src, fallbackKey]
  );
  const [index, setIndex] = useState(0);

  useEffect(() => setIndex(0), [candidates]);

  if (index >= candidates.length) {
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
    <img key={candidates[index]} src={candidates[index]} alt={alt} loading="lazy" onError={() => setIndex((i) => i + 1)} className={className} />
  );
}
