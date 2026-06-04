/**
 * 订单构建工厂 — 创建 Order 对象的唯一入口。
 *
 * 规则：
 * - 所有 Order 对象（用户下单、演示种子、测试数据）必须通过此模块构建
 * - 禁止在 data/orders.ts、mock/data.ts、use-order-store.ts 中手动逐字段拼接 Order
 * - 新增 Order 必填字段时只需改此文件
 */

import type {
  Order,
  ServiceType,
  DeliveryMode,
  OrderStatus,
  PaymentMethod,
  CargoType,
  SpecialRequirement,
  RouteStop,
  LTLWaybill,
  FTLWaybill,
  Compartment,
} from '@/types';

// ── 输入类型 ──

export interface OrderSpec {
  serviceType: ServiceType;
  deliveryMode?: DeliveryMode;
  cruiseType?: 'vending' | 'security';
  status?: OrderStatus;

  // 车辆
  vehicleId?: string;
  vehicleModel?: string;
  vehicleModelId?: string;
  vehicleName?: string;
  vehiclePlate?: string;
  vehicleBattery?: number;
  vehicleCount?: number;

  // 物流 — 整车
  ftlWaybills?: FTLWaybill[];
  stops?: RouteStop[];

  // 物流 — 散件
  ltlWaybills?: LTLWaybill[];
  compartments?: Compartment[];

  // 地址 / 联系人（兼容旧字段）
  origin?: { lat: number; lng: number; address: string };
  destination?: { lat: number; lng: number; address: string };
  senderName?: string;
  senderPhone?: string;
  senderAddress?: string;
  receiverName?: string;
  receiverPhone?: string;
  receiverAddress?: string;

  // 货物
  cargoInfo?: string;
  cargoType?: CargoType;
  cargoWeight?: number;
  specialRequirements?: SpecialRequirement[];

  // 时间 / 费用
  deliveryTime?: string;
  estimatedTime?: number;
  estimatedCost?: number;
  actualCost?: number;
  amount?: number;
  paymentMethod?: PaymentMethod;

  // 里程
  remainingDistance?: number;
  remainingTime?: number;

  // 巡游 / 安防
  duration?: number;
  pickupLocation?: string;
  pickupContact?: string;
  pickupPhone?: string;
  equipmentPackageId?: string;
  packageName?: string;
  rentalPlan?: string;
  routePlanId?: string;

  // 可选覆盖
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

// ── 车辆图片默认映射 ──

const VEHICLE_IMAGE_MAP: Record<string, string> = {
  logistics: '/vehicle-delivery.png',
  vending: '/vehicle-vending.png',
  security: '/vehicle-security.png',
};

// ── 构建函数 ──

let _seq = 0;
function nextId(prefix: string): string {
  _seq++;
  return `${prefix}-${Date.now()}-${_seq}`;
}

/**
 * 构建一个完整的 Order 对象。
 * spec 中未提供的字段将使用安全默认值。
 */
export function buildOrder(spec: OrderSpec): Order {
  const now = spec.createdAt ?? new Date().toISOString();
  const st = spec.serviceType;

  return {
    id: spec.deliveryMode ? nextId('ORD') : nextId('ORD'),
    serviceType: st,
    status: spec.status ?? 'pending',
    deliveryMode: spec.deliveryMode,
    cruiseType:
      spec.cruiseType ??
      (st === 'vending' ? 'vending' : st === 'security' ? 'security' : undefined),

    // 车辆
    vehicleId: spec.vehicleId ?? '',
    vehicleName: spec.vehicleName ?? '',
    vehicleModel: spec.vehicleModel ?? '',
    vehicleModelId: spec.vehicleModelId,
    vehicleImage: spec.vehicleModelId
      ? VEHICLE_IMAGE_MAP[st] ?? '/vehicle-delivery.png'
      : VEHICLE_IMAGE_MAP[st] ?? '/vehicle-delivery.png',
    vehiclePlate: spec.vehiclePlate ?? '',
    vehicleBattery: spec.vehicleBattery ?? 80,
    vehicleCount: spec.vehicleCount,

    // 物流
    ftlWaybills: spec.ftlWaybills,
    stops: spec.stops,
    ltlWaybills: spec.ltlWaybills,
    compartments: spec.compartments,

    // 地址
    origin: spec.origin,
    destination: spec.destination,
    senderName: spec.senderName,
    senderPhone: spec.senderPhone,
    senderAddress: spec.senderAddress,
    receiverName: spec.receiverName,
    receiverPhone: spec.receiverPhone,
    receiverAddress: spec.receiverAddress,

    // 货物
    cargoInfo: spec.cargoInfo,
    cargoType: spec.cargoType,
    cargoWeight: spec.cargoWeight,
    specialRequirements: spec.specialRequirements,

    // 时间 / 费用
    deliveryTime: spec.deliveryTime,
    estimatedTime: spec.estimatedTime,
    estimatedCost: spec.estimatedCost,
    actualCost: spec.actualCost,
    amount: spec.amount ?? spec.estimatedCost ?? 0,
    paymentMethod: spec.paymentMethod,

    // 里程
    remainingDistance: spec.remainingDistance,
    remainingTime: spec.remainingTime,

    // 巡游 / 安防
    duration: spec.duration,
    pickupLocation: spec.pickupLocation,
    pickupContact: spec.pickupContact,
    pickupPhone: spec.pickupPhone,
    equipmentPackageId: spec.equipmentPackageId,
    packageName: spec.packageName,
    rentalPlan: spec.rentalPlan,
    routePlanId: spec.routePlanId,

    // 时间戳
    createdAt: now,
    updatedAt: spec.updatedAt ?? now,
    completedAt: spec.completedAt,
  };
}

/**
 * 构建演示订单。逻辑与 buildOrder 完全相同，仅 ID 前缀使用 "DEMO-"。
 */
export function buildDemoOrder(spec: OrderSpec): Order {
  const order = buildOrder(spec);
  return { ...order, id: `DEMO-${Date.now()}` };
}
