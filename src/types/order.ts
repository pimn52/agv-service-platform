// 三大服务类型
export type ServiceType = 'logistics' | 'vending' | 'security';

// 物流配送模式
export type DeliveryMode = 'full_load' | 'ltl'; // 整车 / 零担

// 订单状态（对应完整工作流，涵盖三种服务类型）
export type OrderStatus =
  | 'pending'         // 待确认
  | 'pricing'         // 计费中
  | 'paying'          // 待支付
  | 'dispatching'     // 调度中
  | 'dispatched'      // 已调度
  | 'picking_up'      // 取货中
  | 'picked_up'       // 已取货/已出发
  | 'loading'         // 装货中
  | 'started'         // 已开始行程（巡游/安防）
  | 'in_transit'      // 运输中
  | 'selling'         // 贩卖中（巡游贩卖）
  | 'vending_active'  // 贩卖活跃
  | 'vending_paused'  // 贩卖暂停
  | 'patrolling'      // 巡检中（安防巡检）
  | 'arrived'         // 已到达
  | 'unloading'       // 卸货中
  | 'paused'          // 暂停服务（通用暂停）
  | 'completed'       // 已完成
  | 'cancelled';      // 已取消

// 支付方式
export type PaymentMethod = 'balance' | 'wechat' | 'alipay' | 'enterprise' | 'invoice';

// 货物类型
export type CargoType = 'daily_necessities' | 'fresh_cold_chain' | 'electronics' | 'documents' | 'furniture' | 'other';

// 特殊要求
export type SpecialRequirement = 'cold_chain' | 'fragile' | 'oversized' | 'hazardous';

// 租赁套餐周期（安防巡检用）
export interface RentalPlan {
  id: string;
  label: string;        // '1个月' | '3个月' | '6个月'
  months: number;
  pricePerDay: number;  // 折后日均
  totalPrice: number;   // 折后总价
  discount: string;     // 折扣描述，如 '9.5折'
}

// 费用明细
export interface CostBreakdown {
  baseFee: number;        // 基础费用
  mileageFee?: number;    // 里程费（物流配送）
  distanceFee: number;    // 距离/里程费（兼容）
  durationFee?: number;   // 时长费（巡游租车）
  serviceFee?: number;    // 平台服务费
  packageFee?: number;    // 设备套餐费（巡游租车）
  equipmentFee?: number;  // 设备费（别名）
  weightFee?: number;     // 重量费（零担物流）
  vehicleFee?: number;    // 车辆租赁费（安防巡检月租）
  cloudControlFee?: number; // 云控管理费（安防巡检）
  insuranceFee: number;   // 保险费
  discount?: number;      // 折扣金额
  discountLabel?: string; // 折扣说明（如 "首单优惠" "3个月9.5折"）
  total: number;          // 总计（兼容字段）
  totalAmount: number;    // 总计
}

// 订单位置
export interface Location {
  lat: number;
  lng: number;
  address: string;
}

// 订单
export interface Order {
  id: string;
  serviceType: ServiceType;
  deliveryMode?: DeliveryMode;       // 仅物流配送
  cruiseType?: 'vending' | 'security'; // 巡游租车子类型
  status: OrderStatus;
  vehicleId: string;
  vehicleName: string;
  vehicleModel: string;              // 车型名称
  vehicleModelId?: string;           // 车型ID
  vehicleImage: string;              // 车辆图片路径
  vehiclePlate: string;              // 车牌号
  plateNumber?: string;              // 车牌号（别名，兼容）
  vehicleCount?: number;             // 车辆数量（巡游/安防批量）
  vehicleBattery?: number;           // 车辆电量百分比(0-100)
  origin?: Location;                 // 仅物流配送
  destination?: Location;            // 仅物流配送
  senderName?: string;                // 发货人
  senderPhone?: string;               // 发货人电话
  senderAddress?: Location | string;    // 发货地址
  receiverName?: string;              // 收货人
  receiverPhone?: string;             // 收货人电话
  receiverAddress?: Location | string;  // 收货地址
  pickupContact?: string;              // 取车联系人（巡游/安防）
  pickupPhone?: string;                // 取车联系电话（巡游/安防）
  pickupLocation?: string;           // 取车地点（巡游/安防）
  routePlanId?: string;              // 路线规划ID（巡游/安防）
  cargoInfo?: string;                // 货物信息
  cargoType?: CargoType;             // 货物类型（日用品/冷链等）
  specialRequirements?: SpecialRequirement[]; // 特殊要求（冷链/易碎等）
  cargoWeight?: number;              // 货物重量(kg)
  rentalPlan?: string;               // 租赁套餐ID（安防巡检）
  deliveryTime?: string;             // 配送时间（用户选择的配送时段）
  estimatedTime?: number;            // 预计时间（分钟）
  estimatedCost?: number;            // 预估费用
  actualCost?: number;               // 实际费用
  remainingDistance?: number;         // 剩余距离(km)
  remainingTime?: number;            // 剩余时间（分钟）
  duration?: number;                 // 租用时长（小时，巡游/安防）
  equipmentPackageId?: string;       // 配套套餐ID（巡游/安防）
  packageName?: string;               // 配套套餐名称（巡游/安防）
  equipmentItems?: string[];         // 配套设备项列表
  amount: number;                    // 订单金额
  paymentMethod?: PaymentMethod;      // 支付方式
  notifications?: AppNotification[];  // 关联通知
  createdAt: string;
  updatedAt: string;
  completedAt?: string;              // 完成时间
}

// 发票信息
export interface InvoiceInfo {
  id: string;
  orderId: string;
  type: 'personal' | 'enterprise';
  title: string;
  taxNumber?: string;
  amount: number;
  status: 'pending' | 'issued' | 'cancelled';
  createdAt: string;
}

// 通知类型
export type NotificationType = 'general' | 'action_required' | 'special';

// 通知
export interface AppNotification {
  id: string;
  type: NotificationType;
  serviceType: ServiceType;
  orderId: string;
  title: string;
  message: string;
  read: boolean;
  dismissed: boolean;
  postponed: boolean;   // "稍后处理"后为true，红点变灰
  actionLabel?: string;  // 操作按钮文本（如"补货""查看"）
  createdAt: string;
}
