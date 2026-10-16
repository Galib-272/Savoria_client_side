'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DashboardSidebar } from '@/components/layout/dashboard-sidebar';
import { DashboardHeader } from '@/components/layout/dashboard-header';
import { getStoredUser, ROLE_HOME, canAccess, type UserRole } from '@/lib/auth';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const user = getStoredUser();

    // Not logged in → redirect to login
    if (!user) {
      router.replace('/login');
      return;
    }

    const role = user.role as UserRole;

    // Customer accounts are diners, redirect them to the customer storefront
    if (role === 'customer') {
      router.replace('/');
      return;
    }

    // Check if this role is allowed on the current path
    if (!canAccess(role, pathname)) {
      // Redirect to the role's default landing page
      router.replace(ROLE_HOME[role] ?? '/dashboard');
      return;
    }

    setAuthorized(true);

    // Join role socket room so this staff user receives real-time role events and notifications
    try {
      const { getSocket } = require('@/lib/socket');
      const socket = getSocket();
      if (socket) {
        socket.emit('join_role_room', role);
      }
    } catch (e) {
      // socket init handled gracefully
    }
  }, [pathname, router]);

  if (!authorized) {
    // Render nothing while the redirect is in flight to prevent flash
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64">
        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
