'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollText } from 'lucide-react';

const auditLogs = [
  { id: '1', user: 'Owner Admin', action: 'Created Manager', entity: 'User', entityId: 's-2', timestamp: '2026-10-09 10:55 AM', details: 'Created manager account for Mahmudul Hasan' },
  { id: '2', user: 'Chef Rakib', action: 'Marked Order Ready', entity: 'Order', entityId: '#1026', timestamp: '2026-10-09 10:40 AM', details: 'Order #1026 marked as ready' },
  { id: '3', user: 'Rahim', action: 'Created Order', entity: 'Order', entityId: '#1029', timestamp: '2026-10-09 10:30 AM', details: 'New dine-in order for Table 2' },
  { id: '4', user: 'Nadia', action: 'Completed Payment', entity: 'Payment', entityId: '#P1028', timestamp: '2026-10-09 09:45 AM', details: 'Cash payment of ৳970 for Order #1028' },
  { id: '5', user: 'Mahmudul Hasan', action: 'Changed Menu Price', entity: 'MenuItem', entityId: 'mi-2', timestamp: '2026-10-09 09:20 AM', details: 'Pepperoni Pizza price changed from ৳500 to ৳550' },
  { id: '6', user: 'System', action: 'Low Stock Alert', entity: 'Inventory', entityId: 'inv-1', timestamp: '2026-10-09 09:00 AM', details: 'Chicken stock is low (3kg remaining, min: 5kg)' },
  { id: '7', user: 'Jamal', action: 'Picked Up Order', entity: 'Order', entityId: '#1027', timestamp: '2026-10-09 08:25 AM', details: 'Delivery order picked up for Dhanmondi' },
  { id: '8', user: 'Mahmudul Hasan', action: 'Adjusted Stock', entity: 'Inventory', entityId: 'inv-3', timestamp: '2026-10-08 06:00 PM', details: 'Rice stock manually adjusted: +20kg' },
  { id: '9', user: 'Owner Admin', action: 'Suspended Staff', entity: 'User', entityId: 's-10', timestamp: '2026-10-08 04:30 PM', details: 'Suspended delivery staff Faisal Reza' },
  { id: '10', user: 'Nadia', action: 'Issued Refund', entity: 'Payment', entityId: '#P1015', timestamp: '2026-10-08 02:15 PM', details: 'Refund of ৳450 for cancelled Order #1015' },
];

export default function AuditLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Track all important system actions and changes</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {log.user.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <span className="text-sm font-medium">{log.user}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{log.action}</Badge></TableCell>
                  <TableCell className="text-sm">
                    <span className="text-muted-foreground">{log.entity}</span>
                    <span className="ml-1 font-medium">{log.entityId}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[300px]">{log.details}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.timestamp}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
