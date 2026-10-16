'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Receipt,
  Search,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  CheckCircle2,
  Clock,
  Printer,
  Calendar,
  DollarSign,
  ArrowUpDown,
  UtensilsCrossed,
  LayoutGrid,
} from 'lucide-react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PaymentRecord {
  _id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'mobile_banking' | 'bank_transfer' | 'stripe';
  paymentStatus: 'paid' | 'pending' | 'refunded';
  cashierName?: string;
  receiptNumber: string;
  stripePaymentIntentId?: string;
  notes?: string;
  createdAt: string;
}

export default function POSTransactionHistoryPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'card' | 'mobile_banking' | 'bank_transfer'>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  const fetchPayments = async () => {
    try {
      const data = await api.getPayments();
      if (Array.isArray(data)) {
        setPayments(data);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();

    const socket = getSocket();
    if (socket) {
      socket.emit('join_role_room', 'cashier');

      // Real-time listener for incoming payments
      socket.on('payment:created', (newPayment: any) => {
        toast.success(`💵 New Transaction Received: ${newPayment.receiptNumber} (${formatCurrency(newPayment.amount)})`);
        setPayments((prev) => [newPayment, ...prev]);
      });

      return () => {
        socket.off('payment:created');
      };
    }
  }, []);

  const handleViewReceipt = async (payment: PaymentRecord) => {
    setLoadingReceipt(true);
    setReceiptModalOpen(true);
    try {
      const receiptData = await api.getReceipt(payment.orderId);
      if (receiptData) {
        setSelectedReceipt(receiptData);
      } else {
        setSelectedReceipt({
          receiptNumber: payment.receiptNumber,
          orderNumber: payment.orderNumber,
          date: payment.createdAt,
          cashier: payment.cashierName || 'Cashier',
          paymentMethod: payment.paymentMethod,
          amount: payment.amount,
          items: [],
          total: payment.amount,
        });
      }
    } catch {
      setSelectedReceipt({
        receiptNumber: payment.receiptNumber,
        orderNumber: payment.orderNumber,
        date: payment.createdAt,
        cashier: payment.cashierName || 'Cashier',
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        items: [],
        total: payment.amount,
      });
    } finally {
      setLoadingReceipt(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const totalCollected = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const cashTotal = payments
      .filter((p) => p.paymentMethod === 'cash')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const cardTotal = payments
      .filter((p) => p.paymentMethod === 'card' || p.paymentMethod === 'stripe')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    const mobileBankTotal = payments
      .filter((p) => p.paymentMethod === 'mobile_banking' || p.paymentMethod === 'bank_transfer')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      totalCollected,
      cashTotal,
      cardTotal,
      mobileBankTotal,
      count: payments.length,
    };
  }, [payments]);

  // Filter & search
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesMethod =
        methodFilter === 'all' ||
        (methodFilter === 'card' && (p.paymentMethod === 'card' || p.paymentMethod === 'stripe')) ||
        p.paymentMethod === methodFilter;

      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.receiptNumber?.toLowerCase().includes(q) ||
        p.orderNumber?.toLowerCase().includes(q) ||
        p.cashierName?.toLowerCase().includes(q) ||
        p.paymentMethod?.toLowerCase().includes(q);

      return matchesMethod && matchesSearch;
    });
  }, [payments, methodFilter, search]);

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Banknote className="h-3.5 w-3.5" /> Cash
          </span>
        );
      case 'card':
      case 'stripe':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300">
            <CreditCard className="h-3.5 w-3.5" /> Card / Stripe
          </span>
        );
      case 'mobile_banking':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200 dark:bg-pink-950/40 dark:text-pink-300">
            <Smartphone className="h-3.5 w-3.5" /> Mobile Banking
          </span>
        );
      case 'bank_transfer':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
            <Building2 className="h-3.5 w-3.5" /> Bank Transfer
          </span>
        );
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top POS Switcher Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/pos"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-all shadow-xs"
          >
            <LayoutGrid className="h-4 w-4 text-amber-500" />
            <span>POS Terminal</span>
          </Link>
          <Link
            href="/dashboard/pos/transactions"
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 shadow-sm transition-all"
          >
            <Receipt className="h-4 w-4 text-emerald-500" />
            <span>Transaction History</span>
            <span className="ml-1 rounded-full bg-emerald-600/20 px-2 py-0.5 text-xs font-bold">
              {payments.length}
            </span>
          </Link>
        </div>

        <div className="text-xs text-muted-foreground">
          Auto-synchronized with Stripe gateway & Cash receipts
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2 text-foreground">
            <Receipt className="h-6 w-6 text-emerald-600" />
            Transaction History
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time ledger of all restaurant payments across Cash, Card, Mobile Banking & Bank Transfer
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-border">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Revenue
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.totalCollected)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {stats.count} total completed payments
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <Banknote className="h-3.5 w-3.5" /> Cash Collected
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.cashTotal)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Instant cash handovers
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="h-3.5 w-3.5" /> Card / Stripe
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.cardTotal)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Stripe electronic gateway
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardContent className="p-4 space-y-1">
            <p className="text-xs font-medium text-pink-600 dark:text-pink-400 uppercase tracking-wider flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5" /> Mobile / Bank
            </p>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.mobileBankTotal)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              bKash, Nagad, Rocket & Bank
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-border bg-card text-xs">
          <button
            onClick={() => setMethodFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-colors',
              methodFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All ({payments.length})
          </button>
          <button
            onClick={() => setMethodFilter('cash')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-colors',
              methodFilter === 'cash'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Cash ({payments.filter((p) => p.paymentMethod === 'cash').length})
          </button>
          <button
            onClick={() => setMethodFilter('card')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-colors',
              methodFilter === 'card'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Card / Stripe ({payments.filter((p) => p.paymentMethod === 'card' || p.paymentMethod === 'stripe').length})
          </button>
          <button
            onClick={() => setMethodFilter('mobile_banking')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-colors',
              methodFilter === 'mobile_banking'
                ? 'bg-pink-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Mobile Banking ({payments.filter((p) => p.paymentMethod === 'mobile_banking').length})
          </button>
          <button
            onClick={() => setMethodFilter('bank_transfer')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-colors',
              methodFilter === 'bank_transfer'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Bank Transfer ({payments.filter((p) => p.paymentMethod === 'bank_transfer').length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search receipt #, order #, staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Receipt #</th>
                <th className="px-4 py-3.5">Order #</th>
                <th className="px-4 py-3.5">Payment Method</th>
                <th className="px-4 py-3.5">Amount</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Received By</th>
                <th className="px-4 py-3.5">Date & Time</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Receipt className="mx-auto mb-2 h-10 w-10 opacity-30" />
                    <p className="text-base font-medium">No transactions found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payments received via Cashier or Online Checkout will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr key={p._id || p.receiptNumber} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-foreground">
                      {p.receiptNumber}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {p.orderNumber}
                    </td>
                    <td className="px-4 py-3">
                      {getMethodBadge(p.paymentMethod)}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      {formatCurrency(p.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Succeeded
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-medium">
                      {p.cashierName || 'Cashier'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleString('en-US', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })
                        : 'Recent'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-xs font-semibold"
                        onClick={() => handleViewReceipt(p)}
                      >
                        <Receipt className="h-3.5 w-3.5 text-primary" />
                        <span>Receipt</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Receipt Details Modal */}
      <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="text-center pb-2 border-b border-border">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-bold">Official Payment Receipt</DialogTitle>
            <p className="text-xs text-muted-foreground">Savoria Restaurant & Grill</p>
          </DialogHeader>

          {loadingReceipt ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Loading receipt details...
            </div>
          ) : selectedReceipt ? (
            <div className="space-y-4 pt-2 text-xs">
              <div className="grid grid-cols-2 gap-2 text-muted-foreground bg-accent/40 p-3 rounded-lg">
                <div>
                  <span className="font-semibold text-foreground">Receipt No:</span>{' '}
                  {selectedReceipt.receiptNumber}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Order No:</span>{' '}
                  {selectedReceipt.orderNumber}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Date:</span>{' '}
                  {new Date(selectedReceipt.date || Date.now()).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Handled By:</span>{' '}
                  {selectedReceipt.cashier || 'Cashier'}
                </div>
              </div>

              {selectedReceipt.items && selectedReceipt.items.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                    Itemized Order Details:
                  </p>
                  <div className="divide-y divide-border border rounded-lg overflow-hidden">
                    {selectedReceipt.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between px-3 py-2 bg-card">
                        <span>
                          {item.quantity}× {item.name}
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1 pt-2 border-t border-border">
                {selectedReceipt.subtotal && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedReceipt.subtotal)}</span>
                  </div>
                )}
                {selectedReceipt.tax > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax (10%):</span>
                    <span>{formatCurrency(selectedReceipt.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-foreground pt-1 border-t border-border/80">
                  <span>Total Paid:</span>
                  <span className="text-primary">{formatCurrency(selectedReceipt.amount || selectedReceipt.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Payment Method:</span>
                  <span className="font-semibold capitalize text-foreground">
                    {selectedReceipt.paymentMethod?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <Button
                  onClick={() => window.print()}
                  variant="outline"
                  className="w-full gap-2 text-xs font-semibold h-9"
                >
                  <Printer className="h-4 w-4" /> Print Receipt
                </Button>
                <Button
                  onClick={() => setReceiptModalOpen(false)}
                  className="w-full text-xs font-semibold h-9"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
