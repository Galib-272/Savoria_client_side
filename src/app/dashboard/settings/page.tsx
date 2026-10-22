'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, UtensilsCrossed, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCurrentUser } from '@/hooks/use-current-user';
import { loadRestaurantSettings } from '@/hooks/use-restaurant-settings';

const EMPTY = {
  name: '',
  tagline: '',
  description: '',
  phone: '',
  email: '',
  address: '',
  hours: '',
  currency: '৳',
  logo: '',
  taxRate: '10',
  deliveryFee: '50',
};

export default function SettingsPage() {
  const currentUser = useCurrentUser();
  const canEdit = currentUser?.role === 'admin';
  const [info, setInfo] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then((data) => {
        if (data) {
          setInfo({
            name: data.name || '',
            tagline: data.tagline || '',
            description: data.description || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            hours: data.hours || '',
            currency: data.currency || '৳',
            logo: data.logo || '',
            taxRate: String(data.taxRate ?? 10),
            deliveryFee: String(data.deliveryFee ?? 50),
          });
        }
      })
      .catch((err) => toast.error(err.message || 'Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!info.name.trim()) {
      toast.error('Restaurant name is required');
      return;
    }
    const taxRate = Number(info.taxRate);
    const deliveryFee = Number(info.deliveryFee);
    if (!(taxRate >= 0 && taxRate <= 100) || !(deliveryFee >= 0)) {
      toast.error('Tax must be 0–100% and the delivery fee 0 or more');
      return;
    }
    setSaving(true);
    try {
      await api.updateSettings({ ...info, name: info.name.trim(), taxRate, deliveryFee });
      await loadRestaurantSettings(true); // refresh cached totals used by cart / POS
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof EMPTY, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div className="space-y-2">
      <Label htmlFor={`set-${key}`}>{label}</Label>
      <Input id={`set-${key}`} value={info[key]} disabled={!canEdit} onChange={(e) => setInfo((p) => ({ ...p, [key]: e.target.value }))} {...props} />
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Restaurant Settings</h1>
          <p className="text-sm text-muted-foreground">Restaurant information shown on the website, and the charges used for every order</p>
        </div>
        {canEdit && (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {!canEdit && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <Lock className="h-4 w-4 shrink-0" /> Only the Main Admin can change restaurant settings. You can view them here.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Restaurant Information</CardTitle>
          <CardDescription>Shown in the website header, footer, About and Contact pages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground">
              {info.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={info.logo} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <UtensilsCrossed className="h-8 w-8" />
              )}
            </div>
            <div className="min-w-0 flex-1">{field('logo', 'Logo image URL (optional)', { placeholder: 'https://…' })}</div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('name', 'Restaurant Name')}
            {field('tagline', 'Tagline')}
          </div>
          <div className="space-y-2">
            <Label htmlFor="set-description">Description</Label>
            <Textarea
              id="set-description"
              rows={3}
              value={info.description}
              disabled={!canEdit}
              onChange={(e) => setInfo((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('phone', 'Phone')}
            {field('email', 'Email', { type: 'email' })}
          </div>
          {field('address', 'Address')}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('hours', 'Opening Hours')}
            {field('currency', 'Currency Symbol')}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Charges & Fees</CardTitle>
          <CardDescription>Applied by the server to every new order (cart, checkout and POS show the same numbers)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('taxRate', 'Tax Rate (%)', { type: 'number', min: 0, max: 100, step: 'any' })}
            {field('deliveryFee', 'Delivery Fee (৳)', { type: 'number', min: 0, step: 'any' })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
