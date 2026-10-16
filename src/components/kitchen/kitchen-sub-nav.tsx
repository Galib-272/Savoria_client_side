'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChefHat, Utensils, ShoppingBag, Bike } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KitchenSubNavProps {
  counts?: {
    active?: number;
    served?: number;
    takeaway?: number;
    delivery?: number;
  };
}

export function KitchenSubNav({ counts }: KitchenSubNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard/kitchen',
      label: 'Kitchen Board',
      icon: ChefHat,
      count: counts?.active,
      color: 'text-amber-500',
      activeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      isExact: true,
    },
    {
      href: '/dashboard/kitchen/served',
      label: 'Served to Table',
      icon: Utensils,
      count: counts?.served,
      color: 'text-teal-500',
      activeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
      isExact: false,
    },
    {
      href: '/dashboard/kitchen/takeaway',
      label: 'Takeaway Orders',
      icon: ShoppingBag,
      count: counts?.takeaway,
      color: 'text-orange-500',
      activeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
      isExact: false,
    },
    {
      href: '/dashboard/kitchen/delivery',
      label: 'Delivery Orders',
      icon: Bike,
      count: counts?.delivery,
      color: 'text-indigo-500',
      activeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      isExact: false,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
      {navItems.map((item) => {
        const isActive = item.isExact ? pathname === item.href : pathname.startsWith(item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all shadow-xs',
              isActive
                ? cn('border-current shadow-sm', item.activeColor)
                : 'border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className={cn('h-4 w-4', item.color)} />
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span
                className={cn(
                  'ml-1 rounded-full px-2 py-0.5 text-xs font-bold',
                  isActive
                    ? 'bg-foreground/10 text-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {item.count}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
