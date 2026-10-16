'use client';

import { useState, useEffect } from 'react';
import { Search, Bell, Menu as MenuIcon, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notifications as fallbackNotifications } from '@/lib/mock-data';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { Notification } from '@/lib/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState<Notification[]>(fallbackNotifications);
  const currentUser = useCurrentUser();

  useEffect(() => {

    // Fetch live notifications
    api.getNotifications().then((data) => {
      if (data && data.length) {
        setNotifList(data.map((n: any) => ({ ...n, id: n._id || n.id })));
      }
    }).catch(console.error);

    // Listen for live socket notifications
    const socket = getSocket();
    if (socket) {
      socket.on('notification', (newNotif: any) => {
        setNotifList((prev) => [
          {
            ...newNotif,
            id: newNotif._id || newNotif.id || String(Date.now()),
            read: false,
            time: 'Just now',
          },
          ...prev,
        ]);
      });
      return () => {
        socket.off('notification');
      };
    }
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      setNotifList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const unreadCount = notifList.filter((n) => !n.read).length;
  const displayName = currentUser?.name || 'Admin User';
  const displayRole = currentUser?.role ? currentUser.role.toUpperCase() : 'Owner Admin';
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-lg sm:px-6">
      <button onClick={onMenuClick} className="lg:hidden">
        <MenuIcon className="h-5 w-5" />
      </button>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search orders, customers, menu..."
          className="pl-10 bg-card"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              {unreadCount > 0 && <Badge>{unreadCount} new</Badge>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifList.slice(0, 6).map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                onClick={() => {
                  handleMarkRead(notif.id);
                  setNotifOpen(false);
                  if (notif.orderId) {
                    router.push(`/dashboard/orders?orderId=${notif.orderId}`);
                  } else {
                    router.push('/dashboard/orders');
                  }
                }}
                className="flex flex-col items-start gap-1 py-3 cursor-pointer hover:bg-accent/60 transition-colors"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{notif.title}</span>
                  {!notif.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <span className="text-xs text-muted-foreground">{notif.message}</span>
                <span className="text-[11px] text-muted-foreground/70">{notif.time || 'Recent'}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleMarkAllRead}
              className="justify-center text-sm text-primary cursor-pointer"
            >
              Mark all as read
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground overflow-hidden border border-border">
                {currentUser?.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={displayName}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.style.display = 'none';
                      if (target.parentElement) {
                        target.parentElement.innerText = initials || 'AD';
                      }
                    }}
                  />
                ) : (
                  initials || 'AD'
                )}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-medium leading-none">{displayName}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{displayRole}</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2.5 py-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground overflow-hidden shrink-0 border border-border">
                  {currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        if (target.parentElement) {
                          target.parentElement.innerText = initials || 'AD';
                        }
                      }}
                    />
                  ) : (
                    initials || 'AD'
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{displayName}</p>
                  <p className="text-xs font-normal text-muted-foreground truncate">{currentUser?.email || ''}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href="/">
              <DropdownMenuItem className="cursor-pointer">
                Back to Website
              </DropdownMenuItem>
            </Link>
            {currentUser?.role === 'customer' ? (
              <Link href="/profile">
                <DropdownMenuItem className="cursor-pointer">
                  My Profile
                </DropdownMenuItem>
              </Link>
            ) : (
              <Link href="/dashboard/settings">
                <DropdownMenuItem className="cursor-pointer">
                  Settings
                </DropdownMenuItem>
              </Link>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                api.logout();
                window.location.href = '/login';
              }}
              className="text-destructive cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
