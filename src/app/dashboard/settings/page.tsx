'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function SettingsPage() {
  const [info, setInfo] = useState({
    name: 'Savoria Restaurant',
    tagline: 'Fine Dining Experience',
    description: '',
    phone: '',
    email: '',
    address: '',
    hours: '10:00 AM - 11:00 PM',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then((data) => {
      if (data) {
        setInfo({
          name: data.restaurantName || info.name,
          tagline: data.tagline || info.tagline,
          description: data.description || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          hours: data.openingHours || info.hours,
        });
      }
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateSettings({
        restaurantName: info.name,
        tagline: info.tagline,
        description: info.description,
        phone: info.phone,
        email: info.email,
        address: info.address,
        openingHours: info.hours,
      });
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => setInfo((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Restaurant Settings</h1>
        <p className="text-sm text-muted-foreground">Configure your restaurant information and preferences</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="reservation">Reservations</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Restaurant Information</CardTitle><CardDescription>Basic details about your restaurant</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <UtensilsCrossed className="h-8 w-8" />
                </div>
                <div>
                  <Button variant="outline" size="sm" onClick={() => toast.info('Upload logo')}>Change Logo</Button>
                  <p className="mt-1 text-xs text-muted-foreground">PNG or JPG, max 2MB</p>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Restaurant Name</Label><Input value={info.name} onChange={(e) => updateField('name', e.target.value)} /></div>
                <div className="space-y-2"><Label>Tagline</Label><Input value={info.tagline} onChange={(e) => updateField('tagline', e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Input value={info.description} onChange={(e) => updateField('description', e.target.value)} /></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Phone</Label><Input value={info.phone} onChange={(e) => updateField('phone', e.target.value)} /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={info.email} onChange={(e) => updateField('email', e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label>Address</Label><Input value={info.address} onChange={(e) => updateField('address', e.target.value)} /></div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Opening Hours</Label><Input value={info.hours} onChange={(e) => updateField('hours', e.target.value)} /></div>
                <div className="space-y-2"><Label>Currency Symbol</Label><Input defaultValue="৳" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Charges & Fees</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2"><Label>Tax Rate (%)</Label><Input type="number" defaultValue="10" /></div>
                <div className="space-y-2"><Label>Service Charge (%)</Label><Input type="number" defaultValue="0" /></div>
                <div className="space-y-2"><Label>Delivery Fee (৳)</Label><Input type="number" defaultValue="50" /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Payment Methods</CardTitle><CardDescription>Enable or disable payment options</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {['Cash', 'Card', 'Mobile Banking (bKash)', 'Mobile Banking (Nagad)', 'Bank Transfer'].map((method) => (
                <div key={method} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">{method}</span>
                  <Switch defaultChecked={method !== 'Bank Transfer'} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Notification Preferences</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {['New order notifications', 'Kitchen order alerts', 'Low stock alerts', 'Daily sales summary', 'Reservation reminders', 'Delivery assignment alerts'].map((item) => (
                <div key={item} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-medium">{item}</span>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reservation Settings */}
        <TabsContent value="reservation" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-lg">Reservation Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Max Guests per Reservation</Label><Input type="number" defaultValue="8" /></div>
                <div className="space-y-2"><Label>Time Slot Duration (min)</Label><Input type="number" defaultValue="90" /></div>
              </div>
              <div className="space-y-2"><Label>Advance Booking Limit (days)</Label><Input type="number" defaultValue="30" /></div>
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm font-medium">Auto-confirm reservations</span>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save Changes'}</Button>
      </div>
    </div>
  );
}
