'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, LayoutGrid } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { FoodImage } from '@/components/restaurant/food-image';
import type { MenuCategory, MenuItem } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

export const effectivePrice = (item: Pick<MenuItem, 'price' | 'discountPrice'>) =>
  item.discountPrice && item.discountPrice > 0 ? item.discountPrice : item.price;

interface CategoryMenuBarProps {
  categories: MenuCategory[];
  items: MenuItem[];
  /** 'all' or a category id */
  active: string;
  onActiveChange: (categoryId: string) => void;
  /** called when a dish is chosen from a category's dropdown */
  onPickItem: (item: MenuItem) => void;
  /** short word shown on each dish row, e.g. "View", "Add", "Edit" */
  pickLabel?: string;
  /** let people pick dishes that are switched off (admin screens) */
  allowUnavailable?: boolean;
  /** also list inactive / empty categories (admin screens) */
  showAllCategories?: boolean;
  size?: 'sm' | 'md';
  /** 'chips' = a row of pills; 'tiles' = big icon cards (home page) */
  variant?: 'chips' | 'tiles';
  /** hide the "All Items" chip (e.g. on the home page) */
  showAllChip?: boolean;
  /** what the dropdown footer does; defaults to just closing it */
  onShowAll?: (category: MenuCategory) => void;
  showAllLabel?: (category: MenuCategory) => string;
  className?: string;
}

/**
 * A row of category chips. Clicking a chip selects that category and opens a dropdown
 * listing every dish inside it (e.g. Burgers → Chicken Cheese Burger, Beef Cheese Burger, ...).
 */
export function CategoryMenuBar({
  categories,
  items,
  active,
  onActiveChange,
  onPickItem,
  pickLabel = 'View',
  allowUnavailable = false,
  showAllCategories = false,
  size = 'md',
  variant = 'chips',
  showAllChip = true,
  onShowAll,
  showAllLabel = (c) => `Show all ${c.name} below`,
  className,
}: CategoryMenuBarProps) {
  const tiles = variant === 'tiles';
  const [openId, setOpenId] = useState<string | null>(null);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, MenuItem[]>();
    for (const item of items) {
      const list = map.get(item.categoryId) || [];
      list.push(item);
      map.set(item.categoryId, list);
    }
    map.forEach((list) => list.sort((a, b) => Number(b.available) - Number(a.available) || a.name.localeCompare(b.name)));
    return map;
  }, [items]);

  const visibleCategories = showAllCategories
    ? categories
    : categories.filter((c) => c.active !== false && (itemsByCategory.get(c.id)?.length ?? 0) > 0);

  const chip = size === 'sm' ? 'gap-1 px-3 py-1.5 text-xs' : 'gap-1.5 px-4 py-2 text-sm';

  return (
    <div
      className={cn(
        tiles
          ? 'grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7'
          : // one swipeable row on phones, wraps onto several lines on bigger screens
            '-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden',
        className
      )}
      role="tablist"
      aria-label="Menu categories"
    >
      {showAllChip && !tiles && (
      <button
        type="button"
        role="tab"
        aria-selected={active === 'all'}
        onClick={() => {
          setOpenId(null);
          onActiveChange('all');
        }}
        className={cn(
          'flex shrink-0 snap-start items-center rounded-full font-medium transition-colors',
          chip,
          active === 'all' ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-accent text-foreground hover:bg-secondary'
        )}
      >
        <LayoutGrid className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} /> All Items
      </button>
      )}

      {visibleCategories.map((cat) => {
        const list = itemsByCategory.get(cat.id) || [];
        const isActive = active === cat.id;
        const isOpen = openId === cat.id;
        return (
          <Popover key={cat.id} open={isOpen} onOpenChange={(o) => setOpenId(o ? cat.id : null)}>
            <PopoverTrigger asChild>
              {tiles ? (
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={isOpen}
                  data-category={cat.name}
                  onClick={() => onActiveChange(cat.id)}
                  className={cn(
                    'group relative flex flex-col items-center gap-1.5 rounded-xl border bg-card px-2 py-4 text-center transition-all hover:border-primary hover:shadow-md',
                    isOpen ? 'border-primary shadow-md' : 'border-border/60'
                  )}
                >
                  <span aria-hidden className="text-3xl transition-transform group-hover:scale-110">{cat.icon}</span>
                  <span className="text-xs font-semibold text-foreground">{cat.name}</span>
                  <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                    {list.length} items <ChevronDown className={cn('h-3 w-3 transition-transform duration-200', isOpen && 'rotate-180')} />
                  </span>
                </button>
              ) : (
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                data-category={cat.name}
                onClick={() => onActiveChange(cat.id)}
                className={cn(
                  'flex shrink-0 snap-start items-center rounded-full font-medium transition-colors',
                  chip,
                  isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-accent text-foreground hover:bg-secondary'
                )}
              >
                <span aria-hidden>{cat.icon}</span>
                {cat.name}
                <span className={cn('rounded-full px-1.5 text-[10px] font-semibold leading-4', isActive ? 'bg-primary-foreground/20' : 'bg-background/70 text-muted-foreground')}>
                  {list.length}
                </span>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />
              </button>
              )}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              collisionPadding={12}
              className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden p-0"
              data-testid="category-dropdown"
            >
              <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-2.5">
                <p className="text-sm font-semibold">
                  <span aria-hidden className="mr-1.5">{cat.icon}</span>
                  {cat.name}
                </p>
                <span className="text-xs text-muted-foreground">
                  {list.length} {list.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              {list.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">No dishes in this category yet.</p>
              ) : (
                <ul role="listbox" aria-label={`${cat.name} dishes`} className="max-h-[min(22rem,60vh)] overflow-y-auto overscroll-contain py-1">
                  {list.map((item, index) => {
                    const disabled = !item.available && !allowUnavailable;
                    return (
                      <li key={item.id} role="option" aria-selected={false} aria-disabled={disabled}>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            setOpenId(null);
                            onPickItem(item);
                          }}
                          className="group flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="w-5 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">{index + 1}.</span>
                          <FoodImage src={item.image} alt="" icon={cat.icon} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{item.name}</span>
                            <span className="flex items-center gap-1.5 text-xs">
                              <span className="font-semibold text-primary">{formatCurrency(effectivePrice(item))}</span>
                              {item.discountPrice && item.discountPrice > 0 && item.discountPrice < item.price ? (
                                <span className="text-muted-foreground line-through">{formatCurrency(item.price)}</span>
                              ) : null}
                              {!item.available && <span className="font-medium text-destructive">· Unavailable</span>}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors group-hover:border-primary group-hover:text-primary">
                            {pickLabel}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  onShowAll?.(cat);
                }}
                className="w-full border-t border-border/70 px-4 py-2 text-center text-xs font-medium text-primary hover:bg-accent"
              >
                {showAllLabel(cat)}
              </button>
            </PopoverContent>
          </Popover>
        );
      })}
    </div>
  );
}
