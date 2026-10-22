'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const PAGE_SIZE = 25;

interface AuditLogRow {
  _id: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: string;
  createdAt: string;
}

const prettyAction = (action: string) => action.toLowerCase().replace(/_/g, ' ');

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLogs(null);
    try {
      const params: Record<string, string> = { page: String(page), limit: String(PAGE_SIZE) };
      if (search) params.search = search;
      const res = await api.getAuditLogs(params);
      setLogs(res.data);
      setTotal(res.total);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load audit logs');
      setLogs([]);
    }
  }, [page, search]);

  useEffect(() => {
    load();
  }, [load]);

  // debounce the search box
  useEffect(() => {
    const t = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">Every important action taken in the system, newest first</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by user, action or details…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Entity</TableHead>
                <TableHead className="hidden sm:table-cell">Details</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs === null ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No audit log entries found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {log.userName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{log.userName}</p>
                          <p className="text-xs capitalize text-muted-foreground">{log.userRole}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="whitespace-nowrap capitalize">
                        {prettyAction(log.action)}
                      </Badge>
                      <p className="mt-1 max-w-[220px] text-xs text-muted-foreground sm:hidden">{log.details}</p>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{log.entity}</TableCell>
                    <TableCell className="hidden max-w-[360px] text-sm text-muted-foreground sm:table-cell">{log.details}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} entr{total === 1 ? 'y' : 'ies'} · page {page} of {pages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
