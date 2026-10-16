'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, Plus, Flame, Clock, Lock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MenuItem } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { getStoredUser } from '@/lib/auth';
import { toast } from 'sonner';

interface FoodCardProps {
  item: MenuItem;
  onAddToCart?: (item: MenuItem) => void;
}

export function FoodCard({ item, onAddToCart }: FoodCardProps) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      setIsLoggedIn(!!getStoredUser());
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const user = getStoredUser();
    if (!user) {
      toast.error('Please log in to order food and add items to your cart.');
      router.push('/login?redirect=/menu');
      return;
    }

    onAddToCart?.(item);
  };

  return (
    <Card className="group overflow-hidden border-border/60 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <Link href={`/menu/${item.id}`} className="block relative aspect-[4/3] overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {item.discountPrice && (
          <Badge className="absolute left-3 top-3 bg-primary text-primary-foreground">
            {Math.round((1 - item.discountPrice / item.price) * 100)}% OFF
          </Badge>
        )}
        {!item.available && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Badge variant="destructive">Unavailable</Badge>
          </div>
        )}
        {item.featured && (
          <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-warning/90 text-white">
            <Flame className="h-4 w-4" />
          </div>
        )}
      </Link>

      <div className="p-4">
        <div className="mb-1 flex items-center justify-between gap-2">
          <Link href={`/menu/${item.id}`} className="truncate font-display text-base font-semibold hover:text-primary transition-colors">
            {item.name}
          </Link>
          <div className="flex shrink-0 items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
            <span className="text-sm font-medium">{item.rating}</span>
          </div>
        </div>

        <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{item.description}</p>

        <div className="mb-3 flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" /> {item.prepTime} min
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            {item.discountPrice ? (
              <>
                <span className="text-lg font-bold text-primary">{formatCurrency(item.discountPrice)}</span>
                <span className="text-sm text-muted-foreground line-through">{formatCurrency(item.price)}</span>
              </>
            ) : (
              <span className="text-lg font-bold text-primary">{formatCurrency(item.price)}</span>
            )}
          </div>
          <Button
            size="icon"
            className="h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!item.available}
            onClick={handleAction}
            title={isLoggedIn ? 'Add to cart' : 'Log in to order'}
          >
            {isLoggedIn ? <Plus className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5 opacity-90" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
