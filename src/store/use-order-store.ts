import { create } from 'zustand';
import type { Order, ServiceType, OrderStatus, AppNotification, CostBreakdown } from '@/types';
import { MOCK_ORDERS, MOCK_NOTIFICATIONS } from '@/mock/data';

// 配送下单表单
export interface DeliveryForm {
  deliveryMode: 'full_load' | 'ltl';
  vehicleModelId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  cargoName: string;
  cargoType?: string;
  specialRequirements?: string[];
  cargoWeight?: number;
  deliveryTime?: string;
}

// 巡游租车下单表单
export interface CruiseForm {
  cruiseType: 'vending' | 'security';
  vehicleModelId: string;
  equipmentPackageId: string;
  rentalPlan?: 'hourly' | 'daily' | 'monthly_1' | 'monthly_3' | 'monthly_6';
  vehicleCount?: number;
  duration?: number;
  pickupLocation: string;
  contactName: string;
  contactPhone: string;
}

const DEFAULT_DELIVERY_FORM: DeliveryForm = {
  deliveryMode: 'full_load',
  vehicleModelId: '',
  senderName: '',
  senderPhone: '',
  senderAddress: '',
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  cargoName: '',
  cargoType: 'general',
  specialRequirements: [],
};

const DEFAULT_CRUISE_FORM: CruiseForm = {
  cruiseType: 'vending',
  vehicleModelId: '',
  equipmentPackageId: '',
  rentalPlan: 'daily',
  vehicleCount: 1,
  pickupLocation: '',
  contactName: '',
  contactPhone: '',
};

interface OrderStore {
  orders: Order[];
  orderFilter: 'all' | 'active' | 'completed';
  setOrderFilter: (filter: 'all' | 'active' | 'completed') => void;

  // 通知
  notifications: AppNotification[];
  dismissNotification: (id: string) => void;
  snoozeNotification: (id: string) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt'>) => void;

  // 费用
  costBreakdown: CostBreakdown | null;
  setCostBreakdown: (cost: CostBreakdown) => void;

  // 配送表单
  deliveryForm: DeliveryForm;
  setDeliveryForm: (updates: Partial<DeliveryForm>) => void;
  resetDeliveryForm: () => void;

  // 巡游表单
  cruiseForm: CruiseForm;
  setCruiseForm: (updates: Partial<CruiseForm>) => void;
  resetCruiseForm: () => void;

  // 当前创建中的订单（支付结果页使用）
  currentCreatingOrder: Order | null;
  setCurrentCreatingOrder: (order: Order | null) => void;

  // 批量订单（整车/巡游/安防）
  batchOrders: Partial<Order>[];
  addBatchOrder: (order: Partial<Order>) => void;
  removeBatchOrder: (index: number) => void;
  updateBatchOrder: (index: number, updates: Partial<Order>) => void;
  clearBatchOrders: () => void;

  // 创建订单
  createOrder: (order: Partial<Order>) => Order;

  // 查询方法
  getOrderById: (id: string) => Order | undefined;
  getActiveOrders: () => Order[];
  getActiveOrdersByType: (type: ServiceType) => Order[];
  getOrdersByFilter: () => Order[];

  // 当前追踪订单
  activeOrderId: string | null;
  setActiveOrderId: (id: string | null) => void;

  // 操作
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: MOCK_ORDERS,
  orderFilter: 'all',
  setOrderFilter: (filter) => set({ orderFilter: filter }),

  notifications: MOCK_NOTIFICATIONS,
  dismissNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, dismissed: true } : n)),
    })),
  snoozeNotification: (id) =>
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, dismissed: true } : n,
      ),
    })),
  addNotification: (notification) =>
    set((s) => ({
      notifications: [
        { ...notification, id: `NOTIF-${Date.now()}`, createdAt: new Date().toISOString() },
        ...s.notifications,
      ],
    })),

  costBreakdown: null,
  setCostBreakdown: (cost) => set({ costBreakdown: cost }),

  deliveryForm: { ...DEFAULT_DELIVERY_FORM },
  setDeliveryForm: (updates) =>
    set((s) => ({ deliveryForm: { ...s.deliveryForm, ...updates } })),
  resetDeliveryForm: () => set({ deliveryForm: { ...DEFAULT_DELIVERY_FORM } }),

  cruiseForm: { ...DEFAULT_CRUISE_FORM },
  setCruiseForm: (updates) =>
    set((s) => ({ cruiseForm: { ...s.cruiseForm, ...updates } })),
  resetCruiseForm: () => set({ cruiseForm: { ...DEFAULT_CRUISE_FORM } }),

  currentCreatingOrder: null,
  setCurrentCreatingOrder: (order) => set({ currentCreatingOrder: order }),

  batchOrders: [],
  addBatchOrder: (order) => set((s) => ({ batchOrders: [...s.batchOrders, order] })),
  removeBatchOrder: (index) =>
    set((s) => ({ batchOrders: s.batchOrders.filter((_, i) => i !== index) })),
  updateBatchOrder: (index, updates) =>
    set((s) => ({
      batchOrders: s.batchOrders.map((o, i) => (i === index ? { ...o, ...updates } : o)),
    })),
  clearBatchOrders: () => set({ batchOrders: [] }),

  activeOrderId: null,
  setActiveOrderId: (id) => set({ activeOrderId: id }),

  createOrder: (partialOrder) => {
    const now = new Date().toISOString();
    const order: Order = {
      id: `ORD${Date.now()}`,
      serviceType: partialOrder.serviceType ?? 'logistics',
      status: 'pending',
      vehicleId: partialOrder.vehicleId ?? '',
      vehicleModel: partialOrder.vehicleModel ?? '默认车型',
      vehicleName: partialOrder.vehicleName ?? '',
      vehicleImage: partialOrder.vehicleImage ?? '/vehicle-delivery.jfif',
      vehiclePlate: partialOrder.vehiclePlate ?? '',
      origin: partialOrder.origin ?? { lat: 39.9, lng: 116.4, address: '北京' },
      destination: partialOrder.destination ?? { lat: 39.95, lng: 116.45, address: '北京' },
      estimatedTime: partialOrder.estimatedTime ?? 30,
      amount: partialOrder.amount ?? partialOrder.estimatedCost ?? 0,
      createdAt: now,
      updatedAt: now,
      ...partialOrder,
    };
    set((s) => ({ orders: [order, ...s.orders] }));
    return order;
  },

  getOrderById: (id) => get().orders.find((o) => o.id === id),
  getActiveOrders: () =>
    get().orders.filter((o) => !['completed', 'cancelled'].includes(o.status)),
  getActiveOrdersByType: (type) =>
    get().orders.filter((o) => o.serviceType === type && !['completed', 'cancelled'].includes(o.status)),
  getOrdersByFilter: () => {
    const { orders, orderFilter } = get();
    switch (orderFilter) {
      case 'active':
        return orders.filter((o) => !['completed', 'cancelled'].includes(o.status));
      case 'completed':
        return orders.filter((o) => o.status === 'completed' || o.status === 'cancelled');
      default:
        return orders;
    }
  },

  addOrder: (order) => set((s) => ({ orders: [order, ...s.orders] })),
  updateOrderStatus: (id, status) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o)),
    })),
}));
