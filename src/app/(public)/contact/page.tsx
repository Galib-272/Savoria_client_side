'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { restaurantInfo as fallbackRestaurantInfo } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { toast } from 'sonner';

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [restaurant, setRestaurant] = useState(fallbackRestaurantInfo);

  useEffect(() => {
    api.getSettings().then((data) => {
      if (data) setRestaurant((prev) => ({ ...prev, ...data }));
    }).catch(console.error);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success('Message sent! We will get back to you soon.');
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  const contactInfo = [
    { icon: MapPin, title: 'Address', value: restaurant.address },
    { icon: Phone, title: 'Phone', value: restaurant.phone },
    { icon: Mail, title: 'Email', value: restaurant.email },
    { icon: Clock, title: 'Hours', value: restaurant.hours },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl font-bold">Get in Touch</h1>
        <p className="mt-2 text-muted-foreground">We would love to hear from you</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Contact Info */}
        <div className="space-y-4">
          {contactInfo.map((info) => (
            <Card key={info.title} className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <info.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold">{info.title}</h3>
                <p className="text-sm text-muted-foreground">{info.value}</p>
              </div>
            </Card>
          ))}

          <Card className="overflow-hidden p-0">
            <div className="aspect-video w-full bg-secondary/50">
              <iframe
                src="https://maps.google.com/maps?q=Dhaka%20Bangladesh&t=&z=13&ie=UTF8&iwloc=&output=embed"
                className="h-full w-full border-0"
                loading="lazy"
                title="Restaurant location"
              />
            </div>
          </Card>
        </div>

        {/* Contact Form */}
        <Card className="p-6">
          <h2 className="mb-6 font-display text-2xl font-bold">Send us a message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="Your name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="+880 1700-000000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" placeholder="How can we help?" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Your message..." rows={5} required />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Sending...' : (
                <>
                  Send Message <Send className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
