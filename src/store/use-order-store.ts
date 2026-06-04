import { create } from 'zustand';
import type { Order, ServiceType, OrderStatus, CostBreakdown, RouteStop, LTLWaybill, FTLWaybill, WaybillStatus, HandoverRecord } from '@/types';
import { getOrders, createOrder as createOrderData } from '@/data/orders';
import { applyMutation, deriveOrderStatus } from '@/lib/order-mutator';
import { createClient } from '@/lib/supabase/client';

/** 将订单完整状态同步到 Supabase（fire-and-forget，失败静默忽略） */
function syncOrderToSupabase(order: Order) {
  if (order.id.startsWith('DEMO-')) return // 演示订单不写 Supabase
  const supabase = createClient()
  supabase
    .from('orders')
    .update({ status: order.status, detail: order, updated_at: new Date().toISOString() })
    .eq('id', order.id)
    .then(({ error }) => { if (error) console.warn('[syncOrder] Supabase 同步失败:', error.message) })
}

export type { RouteStop, LTLWaybill, FTLWaybill } from '@/types';

// 配送下单表单（判别联合类型：deliveryMode 决定字段集合）
interface FTLDeliveryForm {
  deliveryMode: 'full_load'
  ftlWaybills: FTLWaybill[]
  vehicleModelId: string
  vehicleSelections: { modelId: string; quantity: number }[]
  cargoType?: string
  specialRequirements?: string[]
  deliveryTime?: string
  arrivalTime?: string
  periodEnabled?: boolean
  periodFreq?: string
  periodCustomDays?: number
  periodDuration?: string
  periodEnd?: string
  paymentMode?: string
  autoPayAgreed?: boolean
}

interface LTLDeliveryForm {
  deliveryMode: 'ltl'
  ltlWaybills: LTLWaybill[]
  cargoType?: string
  specialRequirements?: string[]
  deliveryTime?: string
  arrivalTime?: string
  periodEnabled?: boolean
  periodFreq?: string
  periodCustomDays?: number
  periodDuration?: string
  periodEnd?: string
  paymentMode?: string
  autoPayAgreed?: boolean
}

export type DeliveryForm = FTLDeliveryForm | LTLDeliveryForm

// 巡游租车下单表单
export interface CruiseForm {
  cruiseType: 'vending' | 'security'
  vehicleModelId: string
  vehicleSelections: { modelId: string; quantity: number }[]
  equipmentPackageId: string
  packageSelections: { packageId: string; quantity: number }[]
  rentalPlan?: 'hourly' | 'daily' | 'monthly_1' | 'monthly_3' | 'monthly_6'
  vehicleCount?: number
  duration?: number
  pickupLocation: string
  locations: { location: string; duration: string }[]
  contactName: string
  contactPhone: string
  patrolArea?: string
  deliveryTime?: string
  // 周期
  arrivalTime?: string
  periodEnabled?: boolean
  periodFreq?: string
  periodCustomDays?: number
  periodDuration?: string
  periodEnd?: string
  paymentMode?: string
  autoPayAgreed?: boolean
}

const DEFAULT_DELIVERY_FORM: FTLDeliveryForm = {
  deliveryMode: 'full_load',
  ftlWaybills: [],
  vehicleModelId: '',
  vehicleSelections: [],
  cargoType: 'general',
  specialRequirements: [],
};

const DEFAULT_CRUISE_FORM: CruiseForm = {
  cruiseType: 'vending',
  vehicleModelId: '',
  vehicleSelections: [],
  equipmentPackageId: '',
  packageSelections: [],
  rentalPlan: 'daily',
  vehicleCount: 1,
  pickupLocation: '',
  locations: [],
  contactName: '',
  contactPhone: '',
};

interface OrderStore {
  orders: Order[];
  orderFilter: 'all' | 'active' | 'completed';
  setOrderFilter: (filter: 'all' | 'active' | 'completed') => void;

  // 费用
  costBreakdown: CostBreakdown | null;
  setCostBreakdown: (cost: CostBreakdown) => void;

  // 配送表单
  deliveryForm: DeliveryForm;
  setDeliveryForm: (form: DeliveryForm) => void;
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
  deleteOrder: (id: string) => void;
  updateOrderField: (id: string, updates: Partial<Order>) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  updateWaybillStatus: (orderId: string, waybillId: string, status: WaybillStatus, anomalyNote?: string) => void;
  updateWaybillStatusBatch: (orderId: string, updates: { waybillId: string; status: WaybillStatus; anomalyNote?: string }[]) => void;
  advanceStopStatus: (orderId: string, stopId: string, newStatus: import('@/types').StopStatus, handover?: import('@/types').HandoverRecord, waybillId?: string) => void;
  updateOrderRoute: (id: string, routePlanId: string) => void;

  // 配送下单模式持久化
  deliveryFormMode: 'full' | 'lcl';
  setDeliveryFormMode: (mode: 'full' | 'lcl') => void;

  // 地址编辑桥接（AddressEditPage → delivery page）
  pendingAddressForm: import('./use-app-store').AddressEditData | null;
  setPendingAddressForm: (data: import('./use-app-store').AddressEditData | null) => void;

  // Supabase 真实数据方法
  fetchOrders: (userId: string) => Promise<void>;
  createOrderSupabase: (userId: string, order: Partial<Order>) => Promise<Order | null>;
}

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  orderFilter: 'all',
  setOrderFilter: (filter) => set({ orderFilter: filter }),

  costBreakdown: null,
  setCostBreakdown: (cost) => set({ costBreakdown: cost }),

  deliveryForm: { ...DEFAULT_DELIVERY_FORM },
  setDeliveryForm: (form) => set({ deliveryForm: form }),
  resetDeliveryForm: () => set({ deliveryForm: { ...DEFAULT_DELIVERY_FORM } }),

  deliveryFormMode: 'full',
  setDeliveryFormMode: (mode) => set({ deliveryFormMode: mode }),

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

  pendingAddressForm: null,
  setPendingAddressForm: (data) => set({ pendingAddressForm: data }),
  activeOrderId: null,
  setActiveOrderId: (id) => set({ activeOrderId: id }),

  createOrder: (_partialOrder) => {
    // TODO: 已迁移到 src/data/orders.ts 的 createOrder，此方法待移除
    throw new Error('createOrder 已废弃，请使用 createOrderSupabase 或 data/orders.ts 的 createOrder');
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
  deleteOrder: (id) => {
    set((s) => ({ orders: s.orders.filter((o) => o.id !== id) }))
    // 同步删除 Supabase 行（演示订单跳过）
    if (!id.startsWith('DEMO-')) {
      createClient()
        .from('orders')
        .delete()
        .eq('id', id)
        .then(({ error }) => { if (error) console.warn('[deleteOrder] Supabase 删除失败:', error.message) })
    }
  },
  updateOrderField: (id, updates) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, ...updates } : o)),
    })),
  /**
   * 更新订单状态。
   * - FTL（整车）：从 stops 派生状态，不直接设置
   * - LTL（散件）：将目标状态映射到运单 status，再派生订单状态（确保底层数据与订单状态一致）
   * - 非物流服务（贩卖/安防）：直接设置 status（向后兼容）
   * - 同时管理 atPickup 辅助字段
   */
  updateOrderStatus: (id, status) => {
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== id) return o;

        // 物流配送
        if (o.serviceType === 'logistics' && (o.deliveryMode === 'full_load' || o.deliveryMode === 'ltl')) {
          // FTL：状态从底层 stops 派生
          if (o.deliveryMode === 'full_load') {
            const derived = deriveOrderStatus(o);
            return { ...o, status: derived, updatedAt: new Date().toISOString() };
          }
          // LTL：订单状态只能是 deriveOrderStatus 的只读输出。
          // 运单推进由 updateWaybillStatus / updateWaybillStatusBatch 负责，
          // 它们内部已调用 deriveOrderStatus 保持订单状态同步。
          // 此处仅做兜底派生（如调用方绕过运单直接调了本函数）。
          const derived = deriveOrderStatus(o);
          return { ...o, status: derived, updatedAt: new Date().toISOString() };
        }

        // 非物流服务：保持原有的直接设置行为
        const prevStatus = o.status;
        const isArrived = status === 'arrived';
        const atPickup = isArrived
          ? (prevStatus === 'dispatched' ? true : prevStatus === 'in_transit' ? false : o.atPickup)
          : o.atPickup;
        return { ...o, status, atPickup, updatedAt: new Date().toISOString() };
      }),
    }))
    const order = get().orders.find(o => o.id === id)
    if (order) syncOrderToSupabase(order)
  },

  updateWaybillStatus: (orderId, waybillId, status, anomalyNote) => {
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== orderId) return o;
        // 保护：只有运单状态确实需要变更时才更新，避免不必要重渲染
        const existing = (o.ltlWaybills || []).find((w) => w.id === waybillId);
        if (existing && existing.status === status && !anomalyNote) return o;
        const updated = applyMutation(o, { type: 'update_waybill', waybillId, status, anomalyNote });
        const derived = deriveOrderStatus(updated);
        return derived !== updated.status ? { ...updated, status: derived } : updated;
      }),
    }))
    const order = get().orders.find(o => o.id === orderId)
    if (order) syncOrderToSupabase(order)
  },

  updateWaybillStatusBatch: (orderId, updates) => {
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== orderId) return o;
        // 保护：只有至少一个运单状态确实需要变更时才更新，避免不必要重渲染
        const hasChanges = updates.some((u) => {
          const existing = (o.ltlWaybills || []).find((w) => w.id === u.waybillId);
          return !existing || existing.status !== u.status;
        });
        if (!hasChanges) return o;
        let updated = { ...o };
        for (const u of updates) {
          updated = applyMutation(updated, { type: 'update_waybill', waybillId: u.waybillId, status: u.status, anomalyNote: u.anomalyNote });
        }
        const derived = deriveOrderStatus(updated);
        const result = derived !== updated.status ? { ...updated, status: derived } : updated;
        // 批量推进到 in_transit/arrived 意味着已离开投件点
        if (derived === 'in_transit' || derived === 'arrived') {
          result.atPickup = false;
        }
        return result;
      }),
    }))
    const order = get().orders.find(o => o.id === orderId)
    if (order) syncOrderToSupabase(order)
  },

  advanceStopStatus: (orderId, stopId, newStopStatus, handover, waybillId) => {
    set((s) => ({
      orders: s.orders.map((o) => {
        if (o.id !== orderId) return o;
        return applyMutation(o, { type: 'advance_stop', stopId, newStatus: newStopStatus, waybillId, handover });
      }),
    }))
    const order = get().orders.find(o => o.id === orderId)
    if (order) syncOrderToSupabase(order)
  },

  updateOrderRoute: (id, routePlanId) =>
    set((s) => ({
      orders: s.orders.map((o) => (o.id === id ? { ...o, routePlanId } : o)),
    })),

  // Supabase 真实数据方法
  fetchOrders: async (userId: string) => {
    const orders = await getOrders(userId)
    if (orders.length > 0) {
      set({ orders })
    }
  },

  createOrderSupabase: async (userId: string, partialOrder: Partial<Order>) => {
    const newOrder = await createOrderData(userId, partialOrder)
    if (newOrder) {
      set((s) => ({ orders: [newOrder, ...s.orders] }))
    }
    return newOrder
  },
}));
