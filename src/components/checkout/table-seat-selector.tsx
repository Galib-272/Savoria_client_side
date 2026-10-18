'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { toast } from 'sonner';
import {
  Armchair,
  CheckCircle2,
  Users,
  MapPin,
  RefreshCw,
  ChevronLeft,
  Sparkles,
  Clock,
  Ban,
  Utensils,
} from 'lucide-react';

interface Seat {
  seatNumber: string;
  status: 'available' | 'occupied' | 'reserved';
  currentCustomerName?: string;
  reservationId?: string;
  orderId?: string;
}

interface Table {
  _id: string;
  number: number;
  tableName: string;
  capacity: number;
  section: string;
  status: 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service';
  currentOrderId?: string;
  waiterName?: string;
  seats: Seat[];
}

interface TableSeatSelectorProps {
  onSelect: (tableId: string, tableNumber: number, tableName: string, selectedSeats: string[]) => void;
  selectedTableId?: string;
  selectedSeats?: string[];
  customerName: string;
}

const statusConfig: Record<string, { color: string; bgColor: string; borderColor: string; icon: React.ReactNode; label: string }> = {
  available: {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    label: 'Available',
  },
  occupied: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    icon: <Users className="h-3.5 w-3.5" />,
    label: 'Occupied',
  },
  reserved: {
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    icon: <Clock className="h-3.5 w-3.5" />,
    label: 'Reserved',
  },
  cleaning: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    icon: <Sparkles className="h-3.5 w-3.5" />,
    label: 'Cleaning',
  },
  out_of_service: {
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    icon: <Ban className="h-3.5 w-3.5" />,
    label: 'Out of Service',
  },
};

const seatStatusColors: Record<string, string> = {
  available: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-400',
  occupied: 'bg-red-500/15 border-red-500/30 text-red-400 cursor-not-allowed opacity-60',
  reserved: 'bg-amber-500/15 border-amber-500/30 text-amber-400 cursor-not-allowed opacity-60',
  selected: 'bg-primary/20 border-primary text-primary ring-2 ring-primary/30 shadow-[0_0_12px_rgba(var(--primary-rgb),0.2)]',
};

const sections = ['All', 'Main', 'Window', 'Patio', 'VIP'];

export function TableSeatSelector({ onSelect, selectedTableId, selectedSeats = [], customerName }: TableSeatSelectorProps) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('All');
  const [expandedTable, setExpandedTable] = useState<string | null>(selectedTableId || null);
  const [localSelectedSeats, setLocalSelectedSeats] = useState<string[]>(selectedSeats);

  useEffect(() => {
    if (selectedSeats && selectedSeats.length > 0) {
      setLocalSelectedSeats(selectedSeats);
    }
  }, [selectedSeats]);

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getTables();
      setTables(data);
    } catch {
      console.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Real-time table updates via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleTableUpdate = (updatedTable: Table) => {
      setTables((prev) =>
        prev.map((t) => (t._id === updatedTable._id ? updatedTable : t))
      );
    };

    socket.on('table:updated', handleTableUpdate);
    return () => {
      socket.off('table:updated', handleTableUpdate);
    };
  }, []);

  const filteredTables = activeSection === 'All'
    ? tables
    : tables.filter((t) => t.section === activeSection);

  const handleTableClick = (table: Table) => {
    if (table.status === 'cleaning' || table.status === 'out_of_service') return;

    if (expandedTable === table._id) {
      // Collapse
      setExpandedTable(null);
    } else {
      setExpandedTable(table._id);
      if (selectedTableId === table._id) {
        setLocalSelectedSeats(selectedSeats);
      } else {
        setLocalSelectedSeats([]);
      }
    }
  };

  const handleSeatToggle = (table: Table, seatNumber: string) => {
    const seat = table.seats.find((s) => s.seatNumber === seatNumber);
    if (!seat || seat.status !== 'available') return;

    setLocalSelectedSeats((prev) => {
      const next = prev.includes(seatNumber)
        ? prev.filter((s) => s !== seatNumber)
        : [...prev, seatNumber];

      // Notify parent immediately of current seat selection
      if (next.length > 0) {
        onSelect(table._id, table.number, table.tableName, next);
      } else {
        onSelect('', 0, '', []);
      }
      return next;
    });
  };

  const handleConfirmSeats = (table: Table) => {
    if (localSelectedSeats.length > 0) {
      onSelect(table._id, table.number, table.tableName, localSelectedSeats);
      toast.success(`${table.tableName} (${localSelectedSeats.join(', ')}) selected`);
      setExpandedTable(null);
    }
  };

  const availableCount = tables.filter((t) => t.status === 'available').length;
  const occupiedCount = tables.filter((t) => t.status === 'occupied').length;
  const reservedCount = tables.filter((t) => t.status === 'reserved').length;

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-muted animate-spin border-t-primary" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading table availability...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Utensils className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Select Your Table & Seats</CardTitle>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={fetchTables} className="h-8 gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>

        {/* Stats bar */}
        <div className="flex items-center gap-3 mt-3">
          <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
            <CheckCircle2 className="h-3 w-3" /> {availableCount} Available
          </Badge>
          <Badge variant="outline" className="gap-1.5 border-red-500/30 bg-red-500/10 text-red-400 text-xs">
            <Users className="h-3 w-3" /> {occupiedCount} Occupied
          </Badge>
          <Badge variant="outline" className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs">
            <Clock className="h-3 w-3" /> {reservedCount} Reserved
          </Badge>
        </div>

        {/* Section filter tabs */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1">
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setActiveSection(section);
              }}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer',
                activeSection === section
                  ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {section === 'All' ? `All (${tables.length})` : section}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {filteredTables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MapPin className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No tables found in this section</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredTables.map((table) => {
              const config = statusConfig[table.status];
              const isExpanded = expandedTable === table._id;
              const isDisabled = table.status === 'cleaning' || table.status === 'out_of_service';
              const isSelected = selectedTableId === table._id && localSelectedSeats.length > 0;
              const availableSeats = table.seats.filter((s) => s.status === 'available').length;

              const cardNode = (
                <div
                  role={isExpanded ? undefined : 'button'}
                  tabIndex={isDisabled || isExpanded ? -1 : 0}
                  onClick={(e) => {
                    if (!isExpanded) {
                      e.preventDefault();
                      handleTableClick(table);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (!isExpanded && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      handleTableClick(table);
                    }
                  }}
                  className={cn(
                    'w-full rounded-xl border-2 p-3.5 text-left transition-all duration-300 flex flex-col justify-between',
                    isDisabled && 'opacity-40 cursor-not-allowed',
                    !isDisabled && !isExpanded && 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5',
                    isExpanded
                      ? 'border-primary bg-primary/5 shadow-xl shadow-primary/10'
                      : isSelected
                        ? 'border-primary/50 bg-primary/5'
                        : `${config.borderColor} ${config.bgColor} hover:border-opacity-60`,
                  )}
                >
                  {/* Table Card Top Section */}
                  <div>
                    {/* Header: Table Name + Status Badge */}
                    <div
                      className={cn('flex items-center justify-between gap-1.5 mb-2.5', isExpanded && 'cursor-pointer')}
                      onClick={(e) => {
                        if (isExpanded) {
                          e.stopPropagation();
                          handleTableClick(table);
                        }
                      }}
                    >
                      <span className="text-base font-bold tracking-tight shrink-0">{table.tableName}</span>
                      <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium shrink-0 rounded-md px-2 py-0.5 border shadow-xs', config.borderColor, config.bgColor, config.color)}>
                        {config.icon}
                        <span className="whitespace-nowrap">{config.label}</span>
                      </span>
                    </div>

                    {/* Section & Capacity Details */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                      <span className="inline-flex items-center gap-1 truncate font-medium">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        <span className="truncate">{table.section}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 text-foreground/80 font-medium">
                        <Armchair className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                        <span>{availableSeats}/{table.capacity} seats</span>
                      </span>
                    </div>
                  </div>

                  {/* Mini seat indicators when collapsed */}
                  {!isExpanded && (
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold">Seats</span>
                      <div className="flex items-center gap-1.5">
                        {table.seats.map((seat) => {
                          const isLocallySelected = selectedTableId === table._id && localSelectedSeats.includes(seat.seatNumber);
                          return (
                            <div
                              key={seat.seatNumber}
                              title={`${seat.seatNumber} (${seat.status})`}
                              className={cn(
                                'h-2.5 w-2.5 rounded-full transition-all',
                                isLocallySelected
                                  ? 'bg-primary ring-2 ring-primary/40 scale-125'
                                  : seat.status === 'available'
                                    ? 'bg-emerald-400'
                                    : seat.status === 'occupied'
                                      ? 'bg-red-400'
                                      : 'bg-amber-400'
                              )}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Expanded seat selection */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                          <Armchair className="h-3.5 w-3.5" />
                          Choose your seats (click to select)
                        </p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setExpandedTable(null);
                          }}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="h-3 w-3" /> Close
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        {table.seats.map((seat) => {
                          const isSeatSelected = localSelectedSeats.includes(seat.seatNumber);
                          const isSeatAvailable = seat.status === 'available';

                          return (
                            <button
                              key={seat.seatNumber}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleSeatToggle(table, seat.seatNumber);
                              }}
                              disabled={!isSeatAvailable}
                              className={cn(
                                'relative flex flex-col items-center gap-1.5 rounded-lg border-2 px-2 py-3 transition-all duration-200 cursor-pointer',
                                isSeatSelected
                                  ? seatStatusColors.selected
                                  : seatStatusColors[seat.status]
                              )}
                            >
                              <Armchair className={cn('h-5 w-5', isSeatSelected && 'animate-bounce')} />
                              <span className="text-[10px] font-semibold">{seat.seatNumber}</span>
                              {seat.currentCustomerName && (
                                <span className="text-[9px] opacity-70 truncate max-w-full">{seat.currentCustomerName}</span>
                              )}
                              {isSeatSelected && (
                                <div className="absolute -top-1 -right-1">
                                  <CheckCircle2 className="h-4 w-4 text-primary fill-primary/20" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {localSelectedSeats.length > 0 && (
                        <div className="mt-3 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Selected: <span className="font-semibold text-primary">{localSelectedSeats.join(', ')}</span> on {table.tableName}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleConfirmSeats(table);
                            }}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Confirm Selection
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );

              return (
                <div key={table._id} className={cn('col-span-1', isExpanded && 'col-span-full')}>
                  {isExpanded ? (
                    cardNode
                  ) : (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          {cardNode}
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-semibold">{table.tableName} — {table.section}</p>
                          <p>{availableSeats} of {table.capacity} seats available</p>
                          {table.waiterName && <p>Waiter: {table.waiterName}</p>}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-5 pt-4 border-t border-border/30 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Seat Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-[11px] text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="text-[11px] text-muted-foreground">Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-[11px] text-muted-foreground">Reserved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            <span className="text-[11px] text-muted-foreground">Your Selection</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
