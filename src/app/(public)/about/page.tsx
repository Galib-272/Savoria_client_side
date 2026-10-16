'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Award, Heart, Leaf, Users, UtensilsCrossed, Sparkles } from 'lucide-react';
import { restaurantInfo as fallbackRestaurantInfo } from '@/lib/mock-data';
import { api } from '@/lib/api';

const values = [
  { icon: Leaf, title: 'Fresh Ingredients', desc: 'We source the finest, freshest ingredients daily from local suppliers' },
  { icon: Heart, title: 'Made with Love', desc: 'Every dish is crafted with passion and attention to detail' },
  { icon: Award, title: 'Quality First', desc: 'We never compromise on quality, from kitchen to your table' },
  { icon: Users, title: 'Customer Focused', desc: 'Your satisfaction is our top priority, always' },
];

const team = [
  { name: 'Chef Rakib', role: 'Head Chef', img: 'https://images.pexels.com/photos/4253300/pexels-photo-4253300.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Chef Nila', role: 'Sous Chef', img: 'https://images.pexels.com/photos/2977514/pexels-photo-2977514.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { name: 'Mahmudul Hasan', role: 'Restaurant Manager', img: 'https://images.pexels.com/photos/2387675/pexels-photo-2387675.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

export default function AboutPage() {
  const [restaurant, setRestaurant] = useState(fallbackRestaurantInfo);

  useEffect(() => {
    api.getSettings().then((data) => {
      if (data) setRestaurant((prev) => ({ ...prev, ...data }));
    }).catch(console.error);
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[400px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
        <img
          src="https://images.pexels.com/photos/2387675/pexels-photo-2387675.jpeg?auto=compress&cs=tinysrgb&w=1200"
          alt="Restaurant"
          className="h-full w-full object-cover"
        />
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-4 text-center">
          <Badge className="mb-4">About Us</Badge>
          <h1 className="font-display text-4xl font-bold text-white sm:text-5xl">Our Story</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/80">{restaurant.description}</p>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg max-w-none text-center">
            <Sparkles className="mx-auto mb-4 h-8 w-8 text-primary" />
            <h2 className="font-display text-3xl font-bold">A Journey of Flavor</h2>
            <p className="mt-4 text-muted-foreground">
              Founded in 2014, {restaurant.name} began as a small family restaurant with a big dream.
              Our founder believed that great food brings people together, creates memories, and tells stories
              that last a lifetime.
            </p>
            <p className="mt-4 text-muted-foreground">
              Over the past decade, we have grown from a cozy neighborhood spot to one of Dhaka's most
              beloved dining destinations. Through it all, our commitment to quality, freshness, and
              exceptional service has never wavered.
            </p>
            <p className="mt-4 text-muted-foreground">
              Today, we serve thousands of happy customers every month, each one experiencing the same
              passion for food that started it all. We invite you to be part of our story.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-bold">Our Values</h2>
            <p className="mt-2 text-muted-foreground">The principles that guide everything we do</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div key={value.title} className="rounded-xl border border-border/60 bg-card p-6 text-center transition-all hover:shadow-md">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <value.icon className="h-6 w-6" />
                </div>
                <h3 className="mb-2 font-semibold">{value.title}</h3>
                <p className="text-sm text-muted-foreground">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <Badge className="mb-3">Meet the Team</Badge>
            <h2 className="font-display text-3xl font-bold">The Faces Behind the Food</h2>
            <p className="mt-2 text-muted-foreground">Talented professionals dedicated to your dining experience</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {team.map((member) => (
              <div key={member.name} className="text-center">
                <div className="relative mx-auto mb-4 h-64 w-full overflow-hidden rounded-2xl">
                  <img src={member.img} alt={member.name} className="h-full w-full object-cover transition-transform hover:scale-105" />
                </div>
                <h3 className="font-display text-xl font-semibold">{member.name}</h3>
                <p className="text-sm text-primary">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Restaurant Photos Gallery */}
      <section className="bg-secondary/30 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <h2 className="font-display text-3xl font-bold">Our Restaurant</h2>
            <p className="mt-2 text-muted-foreground">A glimpse into our world</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[
              'https://images.pexels.com/photos/2387675/pexels-photo-2387675.jpeg?auto=compress&cs=tinysrgb&w=400',
              'https://images.pexels.com/photos/4253300/pexels-photo-4253300.jpeg?auto=compress&cs=tinysrgb&w=400',
              'https://images.pexels.com/photos/24433378/pexels-photo-24433378.jpeg?auto=compress&cs=tinysrgb&w=400',
              'https://images.pexels.com/photos/12181619/pexels-photo-12181619.jpeg?auto=compress&cs=tinysrgb&w=400',
            ].map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl">
                <img src={img} alt={`Gallery ${i + 1}`} className="h-full w-full object-cover transition-transform hover:scale-110" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
