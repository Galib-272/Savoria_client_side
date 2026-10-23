'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { ChevronDown, Lock, Plus, Clock, Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FoodImage } from '@/components/restaurant/food-image';
import { effectivePrice } from '@/components/restaurant/category-menu-bar';
import type { MenuCategory, MenuItem } from '@/lib/types';
import { cn, formatCurrency } from '@/lib/utils';

interface CategoryCardProps {
  category: MenuCategory;
  /** dishes in this category that pass the current search / filters, already sorted */
  dishes: MenuItem[];
  /** how many dishes the category has in total */
  totalCount: number;
  open: boolean;
  onToggle: () => void;
  onAdd: (item: MenuItem) => void;
  canOrder: boolean;
  filtered: boolean;
}

const isDiscounted = (i: MenuItem) => !!i.discountPrice && i.discountPrice > 0 && i.discountPrice < i.price;

/** A menu category (Burgers, Pizza, Biryani …). Click it to drop down every dish inside. */
export const CategoryCard = forwardRef<HTMLDivElement, CategoryCardProps>(function CategoryCard(
  { category, dishes, totalCount, open, onToggle, onAdd, canOrder, filtered },
  ref
) {
  const cover = category.image || dishes[0]?.image;
  const prices = dishes.map(effectivePrice);
  const fromPrice = prices.length ? Math.min(...prices) : 0;
  const offers = dishes.filter(isDiscounted).length;
  const panelId = `category-${category.id}-dishes`;

  return (
    <Card
      ref={ref}
      data-category-card={category.name}
      className={cn(
        'group scroll-mt-24 overflow-hidden border-border/60 transition-all duration-300',
        open ? 'shadow-xl ring-2 ring-primary/40' : 'hover:-translate-y-1 hover:shadow-xl'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="block w-full text-left focus-visible:outline-none"
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <FoodImage
            src={cover}
            alt={category.name}
            icon={category.icon}
            // if the category photo is broken, use one of its dishes' photos instead
            fallbacks={dishes.slice(0, 4).map((d) => d.image)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
          <span className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 text-xl shadow-sm" aria-hidden>
            {category.icon}
          </span>
          {offers > 0 && (
            <Badge className="absolute right-3 top-3 bg-primary text-primary-foreground">
              {offers} on offer
            </Badge>
          )}
          <span className="absolute bottom-3 left-4 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {filtered ? `${dishes.length} of ${totalCount} dishes` : `${totalCount} ${totalCount === 1 ? 'dish' : 'dishes'}`}
          </span>
        </div>

        <div className="p-4">
          <h3 className="font-display text-xl font-semibold">{category.name}</h3>
          <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
            {dishes.slice(0, 3).map((d) => d.name).join(', ')}
            {dishes.length > 3 ? ` and ${dishes.length - 3} more` : ''}
          </p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              from <span className="text-lg font-bold text-primary">{formatCurrency(fromPrice)}</span>
            </span>
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-300',
                open && 'rotate-180'
              )}
              aria-hidden
            >
              <ChevronDown className="h-5 w-5" />
            </span>
          </div>
        </div>
      </button>

      {/* the dropdown: every dish in this category */}
      <div
        id={panelId}
        role="region"
        aria-label={`${category.name} dishes`}
        className={cn('grid transition-[grid-template-rows] duration-300 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      >
        {/* closed dropdowns are hidden from keyboard and screen readers too */}
        <div className="overflow-hidden" aria-hidden={!open} {...(!open ? { inert: '' } : {})}>
          <ul className="divide-y divide-border/60 border-t border-border/60" data-testid="category-dishes">
            {dishes.map((item, index) => (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="w-5 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">{index + 1}.</span>
                <Link href={`/menu/${item.id}`} className="shrink-0" tabIndex={open ? 0 : -1}>
                  <FoodImage src={item.image} alt={item.name} icon={category.icon} className="h-12 w-12 rounded-lg object-cover" />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/menu/${item.id}`}
                    tabIndex={open ? 0 : -1}
                    className="line-clamp-2 text-sm font-semibold leading-snug hover:text-primary"
                  >
                    {item.name}
                  </Link>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs">
                    <span className="font-bold text-primary">{formatCurrency(effectivePrice(item))}</span>
                    {isDiscounted(item) && <span className="text-muted-foreground line-through">{formatCurrency(item.price)}</span>}
                    <span className="flex items-center gap-0.5 text-muted-foreground">
                      <Clock className="h-3 w-3" /> {item.prepTime}m
                    </span>
                    {item.reviewCount > 0 && (
                      <span className="flex items-center gap-0.5 text-muted-foreground">
                        <Star className="h-3 w-3 fill-warning text-warning" /> {item.rating}
                      </span>
                    )}
                    {!item.available && <span className="font-medium text-destructive">Unavailable</span>}
                  </div>
                </div>
                <button
                  type="button"
                  tabIndex={open ? 0 : -1}
                  disabled={!item.available}
                  onClick={() => onAdd(item)}
                  title={canOrder ? `Add ${item.name} to cart` : 'Log in to order'}
                  aria-label={canOrder ? `Add ${item.name} to cart` : `Log in to order ${item.name}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {canOrder ? <Plus className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
});
