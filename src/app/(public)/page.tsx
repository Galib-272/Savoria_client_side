'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { ArrowRight, Star, Clock, Award, Users, ShoppingBag, Heart, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FoodCard } from '@/components/restaurant/food-card';
import { CategoryMenuBar } from '@/components/restaurant/category-menu-bar';
import { restaurantInfo as fallbackRestaurantInfo } from '@/lib/mock-data';
import { couponsToOffers, type OfferCard } from '@/lib/offers';
import { formatCurrency } from '@/lib/utils';
import { api } from '@/lib/api';
import { addToCart } from '@/lib/cart';
import { getStoredUser } from '@/lib/auth';
import type { MenuItem, MenuCategory, Review } from '@/lib/types';
import { toast } from 'sonner';

const heroSlides = [
  {
    title: 'Authentic Flavors, Unforgettable Experience',
    subtitle: 'Where Every Bite Tells a Story',
    image: 'https://images.pexels.com/photos/2387675/pexels-photo-2387675.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    title: 'Crafted with Passion, Served with Love',
    subtitle: 'Premium Dining in the Heart of Dhaka',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
  {
    title: 'Fresh Ingredients, Bold Flavors',
    subtitle: 'From Our Kitchen to Your Table',
    image: 'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=1200',
  },
];

const stats = [
  { icon: Award, value: '10+', label: 'Years of Experience' },
  { icon: ShoppingBag, value: '50+', label: 'Menu Items' },
  { icon: Users, value: '10K+', label: 'Happy Customers' },
  { icon: Clock, value: '50K+', label: 'Orders Served' },
];

export default function HomePage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cats, setCats] = useState<MenuCategory[]>([]);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [offers, setOffers] = useState<OfferCard[]>([]);
  const [restaurant, setRestaurant] = useState(fallbackRestaurantInfo);

  useEffect(() => {
    api.getCoupons().then((data) => setOffers(couponsToOffers((Array.isArray(data) ? data : []).map((c: any) => ({ ...c, id: c._id || c.id }))))).catch(() => undefined);

    // Fetch live menu items
    api.getMenuItems().then((data) => {
      if (data && data.length > 0) {
        setItems(data.map((i: any) => ({ ...i, id: i._id || i.id })));
      }
    }).catch(console.error);

    // Fetch live categories
    api.getCategories().then((data) => {
      if (data && data.length > 0) {
        setCats(data.map((c: any) => ({ ...c, id: c._id || c.id })));
      }
    }).catch(console.error);

    // Fetch live reviews
    api.getReviews().then((data) => {
      if (data && data.length > 0) {
        setUserReviews(data.map((r: any) => ({ ...r, id: r._id || r.id })));
      }
    }).catch(console.error);

    // Fetch live settings
    api.getSettings().then((data) => {
      if (data) {
        setRestaurant((prev) => ({ ...prev, ...data }));
      }
    }).catch(console.error);
  }, []);

  const featuredItems = items.filter((i) => i.featured).slice(0, 8);
  const popularItems = (items.filter((i) => (i as any).popular).length > 0
    ? items.filter((i) => (i as any).popular)
    : items).slice(0, 4);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const router = useRouter();

  const handleAddToCart = (item: MenuItem) => {
    const user = getStoredUser();
    if (!user) {
      toast.error('Please log in to order food and add items to your cart.');
      router.push('/login?redirect=/menu');
      return;
    }
    const added = addToCart(item, 1);
    if (added) {
      toast.success(`${item.name} added to cart`);
    } else {
      toast.info('Staff accounts take orders through the POS in the dashboard.');
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[600px] w-full overflow-hidden">
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
            <img
              src={slide.image}
              alt={slide.title}
              className="h-full w-full object-cover"
            />
          </div>
        ))}

        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <Badge className="mb-4 bg-primary/90 text-primary-foreground">
              <Star className="mr-1 h-3 w-3 fill-warning" /> Rated #1 Restaurant in Dhaka
            </Badge>
            <h1 className="mb-4 font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              {heroSlides[currentSlide].title}
            </h1>
            <p className="mb-8 text-lg text-white/80 sm:text-xl">
              {heroSlides[currentSlide].subtitle}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/menu">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Order Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/menu">
                <Button size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white">
                  Explore Menu
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <button
          onClick={() => setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)}
          className="absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30 md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % heroSlides.length)}
          className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 items-center justify-center rounded-full bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30 md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentSlide ? 'w-8 bg-primary' : 'w-2 bg-white/50'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center">
                <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <stat.icon className="h-6 w-6" />
                </div>
                <span className="font-display text-3xl font-bold text-foreground">{stat.value}</span>
                <span className="mt-1 text-sm text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-bold">Browse by Category</h2>
            <p className="mt-2 text-muted-foreground">Explore our diverse menu categories</p>
          </div>
          <CategoryMenuBar
            variant="tiles"
            showAllChip={false}
            categories={cats}
            items={items}
            active=""
            onActiveChange={() => undefined}
            onPickItem={(item) => router.push(`/menu/${item.id}`)}
            pickLabel="View"
            allowUnavailable
            onShowAll={(cat) => router.push(`/menu?category=${cat.id}`)}
            showAllLabel={(cat) => `Open ${cat.name} on the menu page`}
          />
        </div>
      </section>

      {/* Featured Menu Section */}
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-bold">Featured Dishes</h2>
              <p className="mt-2 text-muted-foreground">Chef&apos;s special selections just for you</p>
            </div>
            <Link href="/menu">
              <Button variant="outline" className="hidden sm:flex">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredItems.map((item) => (
              <FoodCard key={item.id} item={item} onAddToCart={() => handleAddToCart(item)} />
            ))}
          </div>
          <div className="mt-8 text-center sm:hidden">
            <Link href="/menu">
              <Button variant="outline">View All Menu <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Popular Items Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <Badge className="mb-3 bg-warning/90 text-white">
              <Heart className="mr-1 h-3 w-3 fill-white" /> Popular Today
            </Badge>
            <h2 className="font-display text-3xl font-bold">Most Loved Dishes</h2>
            <p className="mt-2 text-muted-foreground">What our customers are ordering right now</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {popularItems.map((item) => (
              <FoodCard key={item.id} item={item} onAddToCart={() => handleAddToCart(item)} />
            ))}
          </div>
        </div>
      </section>

      {/* Offers Section */}
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4 text-foreground sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-bold">Special Offers</h2>
            <p className="mt-2 text-muted-foreground">Don&apos;t miss out on these amazing deals</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${offer.color} p-6 text-white shadow-lg transition-transform hover:scale-105`}
              >
                <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
                <Badge className="mb-3 bg-white/20 text-white">{offer.badge}</Badge>
                <h3 className="mb-2 font-display text-3xl font-bold">{offer.title}</h3>
                <p className="text-white/90">{offer.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge className="mb-4">Our Story</Badge>
              <h2 className="mb-4 font-display text-3xl font-bold sm:text-4xl">
                A Decade of Culinary Excellence
              </h2>
              <p className="mb-6 text-muted-foreground">
                Since 2014, {restaurant.name} has been serving authentic, flavorful dishes crafted with
                the finest ingredients. Our journey began with a simple mission: to create memorable dining
                experiences that bring people together over great food.
              </p>
              <p className="mb-6 text-muted-foreground">
                Our team of expert chefs combines traditional techniques with modern innovation to deliver
                dishes that delight the senses. Every plate is a reflection of our passion for quality and
                our commitment to excellence.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-border/60 bg-card p-4">
                  <Award className="mb-2 h-6 w-6 text-primary" />
                  <h3 className="font-semibold">Award Winning</h3>
                  <p className="text-sm text-muted-foreground">Best Restaurant 2024</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card p-4">
                  <Heart className="mb-2 h-6 w-6 text-primary" />
                  <h3 className="font-semibold">Made with Love</h3>
                  <p className="text-sm text-muted-foreground">Every single dish</p>
                </div>
              </div>
            </div>
            <div className="relative">
              <img
                src="https://images.pexels.com/photos/4253300/pexels-photo-4253300.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Our chef at work"
                className="rounded-2xl shadow-xl"
              />
              <div className="absolute -bottom-6 -left-6 rounded-2xl bg-primary p-6 text-primary-foreground shadow-xl">
                <p className="font-display text-4xl font-bold">10+</p>
                <p className="text-sm">Years of Excellence</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-bold">What Our Customers Say</h2>
            <p className="mt-2 text-muted-foreground">Real reviews from real customers</p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {userReviews.slice(0, 6).map((review) => (
              <Card key={review.id} className="p-6">
                <Quote className="mb-3 h-8 w-8 text-primary/30" />
                <div className="mb-3 flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < review.rating ? 'fill-warning text-warning' : 'text-border'}`}
                    />
                  ))}
                </div>
                <p className="mb-4 text-sm text-muted-foreground">&ldquo;{review.comment}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                    {review.customerName?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{review.customerName}</p>
                    <p className="text-xs text-muted-foreground">{review.date || 'Recently'}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary to-orange-600 px-8 py-16 text-center text-white">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 -translate-y-20 translate-x-20" />
            <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-white/10 translate-y-16 -translate-x-16" />
            <h2 className="mb-4 font-display text-3xl font-bold sm:text-4xl">Ready to Order?</h2>
            <p className="mb-8 text-white/90">Browse our menu and have your favorite meal delivered to your doorstep</p>
            <Link href="/menu">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                Order Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
