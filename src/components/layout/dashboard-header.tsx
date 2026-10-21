'use client';

import { useState, useEffect } from 'react';
import { Search, Bell, Menu as MenuIcon, LogOut, CheckCheck, Trash2, CheckCircle2, User } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { Notification } from '@/lib/types';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

interface DashboardHeaderProps {
  onMenuClick: () => void;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifList, setNotifList] = useState<Notification[]>([]);
  const [isRinging, setIsRinging] = useState(false);
  const currentUser = useCurrentUser();

  const profileHref =
    currentUser?.role === 'delivery' || pathname?.startsWith('/dashboard/delivery')
      ? '/dashboard/delivery/profile'
      : currentUser?.role === 'cashier' || pathname?.startsWith('/dashboard/pos')
      ? '/dashboard/pos/profile'
      : currentUser?.role === 'kitchen' || pathname?.startsWith('/dashboard/kitchen')
      ? '/dashboard/kitchen/profile'
      : '/profile';

  useEffect(() => {
    // Fetch live notifications (API already filters by role)
    const fetchNotifications = () => {
      api.getNotifications().then((data) => {
        if (Array.isArray(data)) {
          setNotifList(data.map((n: any) => ({ ...n, id: n._id || n.id })));
        }
      }).catch(console.error);
    };

    fetchNotifications();

    const userRole = currentUser?.role || '';

    // Listen for live socket notifications & filter by role
    const socket = getSocket();
    if (socket) {
      socket.on('notification', (newNotif: any) => {
        // Client-side role filtering: only show notifications targeted to this user's role
        const notifTargetRoles: string[] = newNotif.targetRoles || [];
        const isAdmin = userRole === 'admin' || userRole === 'manager';
        const isTargeted = notifTargetRoles.length === 0 || notifTargetRoles.includes(userRole);

        if (!isAdmin && !isTargeted) {
          return; // Skip notifications not meant for this role
        }

        setNotifList((prev) => [
          {
            ...newNotif,
            id: newNotif._id || newNotif.id || String(Date.now()),
            read: false,
            time: 'Just now',
          },
          ...prev,
        ]);
        // Trigger subtle bell animation
        setIsRinging(true);
        setTimeout(() => setIsRinging(false), 1500);

        // Show live popup toast for staff
        toast.info(newNotif.title, {
          description: newNotif.message,
          duration: 6000,
          action: newNotif.type === 'reservation' ? {
            label: 'View',
            onClick: () => router.push('/dashboard/reservations'),
          } : undefined,
        });
      });

      socket.on('notification:read_all', () => {
        setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
      });

      socket.on('notification:cleared_all', () => {
        setNotifList([]);
      });

      socket.on('notification:read_one', ({ id }: { id: string }) => {
        setNotifList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      });

      return () => {
        socket.off('notification');
        socket.off('notification:read_all');
        socket.off('notification:cleared_all');
        socket.off('notification:read_one');
      };
    }
  }, [currentUser?.role]);

  const handleMarkRead = async (id: string) => {
    // Optimistic local update
    setNotifList((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await api.markNotificationRead(id);
    } catch {
      // Keep optimistic
    }
  };

  const handleMarkAllRead = async () => {
    // Optimistic local update: all read immediately
    setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.markAllNotificationsRead();
    } catch {
      // Keep optimistic
    }
  };

  const handleClearAll = async () => {
    setNotifList([]);
    try {
      await api.clearAllNotifications();
    } catch {
      // Keep optimistic
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
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "relative transition-all duration-200 hover:bg-accent/80",
                isRinging && "animate-bell-ring"
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm animate-badge-pop">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 sm:w-96 p-0 rounded-2xl overflow-hidden border border-border shadow-2xl bg-card animate-in fade-in-50 zoom-in-95 duration-150"
          >
            {/* Header with Title + Unread Badge + Mark All Read Button */}
            <div className="flex items-center justify-between border-b border-border bg-accent/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Notifications</span>
                {unreadCount > 0 ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary animate-badge-pop">
                    {unreadCount} new
                  </span>
                ) : (
                  <span className="text-[10px] text-muted-foreground font-medium">All caught up</span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAllRead();
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer px-2 py-1 rounded-md hover:bg-primary/10"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Scrollable list with max height so it never overflows off-screen */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
              {notifList.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30 animate-pulse" />
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">You're all caught up!</p>
                </div>
              ) : (
                notifList.map((notif) => (
                  <div
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
                    className={cn(
                      'flex flex-col gap-1 p-3.5 transition-all duration-150 cursor-pointer text-left group',
                      !notif.read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-accent/60 opacity-80'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn('text-xs font-bold truncate', !notif.read ? 'text-foreground' : 'text-muted-foreground')}>
                        {notif.title}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] text-muted-foreground/70">{notif.time || 'Just now'}</span>
                        {!notif.read && (
                          <span className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/20 shrink-0" />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Footer with Mark all as read & Clear all */}
            {notifList.length > 0 && (
              <div className="border-t border-border bg-accent/30 p-2 flex items-center justify-between text-xs text-muted-foreground px-4">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="font-medium text-primary hover:underline transition-colors cursor-pointer flex items-center gap-1"
                >
                  <CheckCheck className="h-3 w-3" /> Mark all as read
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="font-medium text-muted-foreground hover:text-destructive transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Clear all
                </button>
              </div>
            )}
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
            <Link href={profileHref}>
              <DropdownMenuItem className="cursor-pointer gap-2">
                <User className="h-4 w-4" /> Profile
              </DropdownMenuItem>
            </Link>
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
