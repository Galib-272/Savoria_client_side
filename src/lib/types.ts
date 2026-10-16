export type UserRole = 'admin' | 'manager' | 'cashier' | 'kitchen' | 'waiter' | 'delivery' | 'customer';

export type OrderType = 'dine-in' | 'takeaway' | 'delivery';

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'assigned'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'refunded';
export type PaymentMethod = 'cash' | 'card' | 'mobile_banking' | 'bank_transfer';

export type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'out_of_service';

export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export type StaffStatus = 'active' | 'inactive' | 'suspended' | 'on_leave';

export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
  active: boolean;
  order: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  image: string;
  categoryId: string;
  available: boolean;
  featured: boolean;
  popular: boolean;
  rating: number;
  reviewCount: number;
  prepTime: number;
  ingredients: string[];
  allergens: string[];
  modifiers?: MenuModifier[];
}

export interface MenuModifier {
  id: string;
  name: string;
  type: 'single' | 'multiple';
  required: boolean;
  options: MenuModifierOption[];
}

export interface MenuModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  modifiers: { name: string; price: number }[];
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  orderType: OrderType;
  tableNumber?: number;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  deliveryFee: number;
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  status: OrderStatus;
  waiterName?: string;
  cashierName?: string;
  kitchenStaffName?: string;
  deliveryStaffName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  address?: string;
  timeline: { time: string; status: string; label: string }[];
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  modifiers?: string[];
}

export interface Seat {
  seatNumber: 'S1' | 'S2' | 'S3' | 'S4';
  status: 'available' | 'occupied' | 'reserved';
  currentCustomerName?: string;
  reservationId?: string;
  orderId?: string;
}

export interface Table {
  id: string;
  _id?: string;
  number: number;
  tableName?: string;
  capacity: number;
  section: string;
  status: TableStatus;
  currentOrderId?: string;
  waiterName?: string;
  seats?: Seat[];
}

export interface Reservation {
  id: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  guests: number;
  tableNumber?: number;
  specialRequest?: string;
  status: ReservationStatus;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: StaffStatus;
  joinDate: string;
  avatar?: string;
  assignedManager?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  cost: number;
  supplier: string;
  expirationDate?: string;
  status: InventoryStatus;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  address: string;
  products: string[];
  status: 'active' | 'inactive';
}

export interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierName: string;
  items: { name: string; quantity: number; unit: string; cost: number }[];
  total: number;
  date: string;
  status: 'pending' | 'completed';
}

export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  createdBy: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrder: number;
  maxDiscount?: number;
  expiry: string;
  usageLimit: number;
  used: number;
  active: boolean;
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  date: string;
  orderId: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'kitchen' | 'table' | 'delivery' | 'inventory' | 'payment' | 'system';
  read: boolean;
  time: string;
  orderId?: string;
  tableNumber?: number;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  badge: string;
  color: string;
  active: boolean;
}

export interface DashboardStat {
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
}
