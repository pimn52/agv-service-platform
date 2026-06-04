// 三大服务类型
export type ServiceType = 'logistics' | 'vending' | 'security';

// 物流配送模式
export type DeliveryMode = 'full_load' | 'ltl'; // 整车 / 散件直送

// 经停点类型（配送路线上的装货点 / 卸货点）
export type StopType = 'pickup' | 'delivery';

// 经停点作业状态
export type StopStatus = 'pending' | 'arrived' | 'in_progress' | 'completed' | 'skipped' | 'exception';

// 路线经停点
export interface RouteStop {
  id: string;
  type: StopType;
  stopStatus?: StopStatus;    // 该站作业状态，默认 'pending'
  address: string;
  contactName: string;
  contactPhone: string;
  timeWindow?: string;       // 期望时间窗，仅 delivery
  cargoDescription?: string; // 该站货物描述
  cargoWeight?: number;      // 该站货物重量(kg)
  sequence: number;          // 路线顺序
  handoverRecords?: HandoverRecord[]; // 交接记录（装货/卸货完成时生成）
}

// 运单（散件直送，1→1 固定）
export interface LTLWaybill {
  id: string;
  // 表单字段（下单页用）
  pickupAddress?: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  deliveryAddress?: string;
  deliveryContactName?: string;
  deliveryContactPhone?: string;
  cargoDescription?: string;
  cargoWeight?: number;
  specialRequirements?: SpecialRequirement[];  // 运单级特殊要求（冷链/易碎/超大件）
  // 运营字段（系统分配）
  orderId?: string;
  stopId?: string;                  // 关联经停点
  compartmentId?: string;           // 分配的格口
  cargoItems?: CargoItem[];         // 货物明细
  status?: WaybillStatus;
  pickupCode?: string;              // 投件验证码（6位数字）
  deliveryCode?: string;            // 取件验证码（6位数字）
  handoverRecords?: HandoverRecord[];
  createdAt?: string;
  updatedAt?: string;
}

// 整车运单（整车配送，可变经停点 1→N 或 N→1）
// status 是派生字段，由 stops 的 stopStatus 汇总推导，不独立维护状态机：
//   - 全部 stops completed → completed
//   - 任一 stop exception  → exception
//   - 否则                  → in_progress
// createdAt/updatedAt 为 Unix 毫秒时间戳，completedAt 在 status→completed 时打点
export interface FTLWaybill {
  id: string;
  vehicleModelId: string;           // 车型 ID（下单时选择，如 'lm_z5'）
  vehicleModelName?: string;
  vehicleId?: string;               // 车辆实例 ID（系统分配，如 'v_001'）
  vehiclePlate?: string;            // 车牌号（人读展示）
  vehicleBattery?: number;          // 车辆电量(0-100)
  stops: RouteStop[];               // 该运单经停点（至少 1 pickup + 1 delivery）
  cargoDescription?: string;
  cargoWeight?: number;
  cargoType?: string;
  specialRequirements?: string[];
  status?: 'created' | 'assigned' | 'in_progress' | 'completed' | 'exception';
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;             // SLA 计算输入：status 变为 completed 的时间
}

// 格口（车辆货舱独立分区，电子锁控）
export interface Compartment {
  id: string;                       // "COMP-001"
  vehicleId: string;                // 所属车辆
  label: string;                    // 展示名，如 "A舱"、"B舱"
  capacityKg: number;               // 载重上限(kg)
  capacityVolume: number;           // 容积上限(L)
}

// 货物项
export interface CargoItem {
  name: string;                     // 品名
  quantity: number;                 // 件数
  weight: number;                   // 重量(kg)
  note?: string;                    // 备注
}

// 交接记录
export interface HandoverRecord {
  id: string;
  type: 'pickup' | 'delivery';      // 投件 / 取件
  timestamp: string;
  operatorName: string;             // 操作人姓名
  signatureUrl?: string;            // 电子签名图片
  photos?: string[];                // 现场拍照
  anomalyNote?: string;             // 异常备注（如有）
}

// 运单状态
export type WaybillStatus =
  | 'created'          // 已创建，待分配格口
  | 'assigned'         // 已分配格口，等待投件
  | 'loaded'           // 已投件，货物在车
  | 'in_transit'       // 运输中
  | 'arrived'          // 已到达取件点，等待取件
  | 'completed'        // 已取件，运单完结
  | 'exception';       // 异常（货损/无人取件/拒收等）

// 趟次
export interface Trip {
  id: string;                       // "TRIP-001"
  vehicleId: string;                // 执行车辆
  waybillIds: string[];             // 本趟次运载的运单
  route: string[];                  // 有序经停点 ID 列表
  status: 'planned' | 'in_progress' | 'completed';
  createdAt: string;
}

// 订单状态（对应完整工作流，涵盖三种服务类型）
export type OrderStatus =
  | 'pending'         // 待确认
  | 'pricing'         // 计费中
  | 'paying'          // 待支付
  | 'dispatching'     // 调度中
  | 'dispatched'      // 已调度
  | 'picking_up'    // 投件中
  | 'picked_up'       // 已取件
  | 'loading'         // 装货中
  | 'started'         // 已就位（巡游/安防）
  | 'in_transit'      // 运输中
  | 'selling'         // 贩卖中（巡游贩卖）
  | 'vending_active'  // 贩卖活跃
  | 'patrolling_paused' // 巡检暂停
  | 'vending_paused'  // 贩卖暂停
  | 'patrolling'      // 巡检中（安防巡检）
  | 'arrived'         // 已到达
  | 'unloading'       // 卸货中
  | 'completed'       // 已完成
  | 'cancelled';      // 已取消

// 支付方式
export type PaymentMethod = 'balance' | 'wechat' | 'alipay' | 'enterprise' | 'invoice';

// 货物类型
export type CargoType = 'daily_necessities' | 'fresh_cold_chain' | 'electronics' | 'documents' | 'furniture' | 'other';

// 特殊要求
export type SpecialRequirement = 'cold_chain' | 'fragile' | 'oversized';

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
  distanceFee: number;    // 里程费（物流配送）
  durationFee?: number;   // 时长费（巡游租车）
  serviceFee?: number;    // 平台服务费
  packageFee?: number;    // 设备套餐费（巡游租车）
  equipmentFee?: number;  // 设备费（别名）
  weightFee?: number;     // 重量费（散件直送）
  vehicleFee?: number;    // 车辆租赁费（安防巡检月租）
  cloudControlFee?: number; // 云控管理费（安防巡检）
  insuranceFee: number;   // 保险费
  discount?: number;      // 折扣金额
  discountLabel?: string; // 折扣说明（如 "首单优惠" "3个月9.5折"）
  nightDiscount?: number; // 夜间折扣金额
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
  vehicleCount?: number;             // 车辆数量（巡游/安防批量）
  vehicleBattery?: number;           // 车辆电量百分比(0-100)
  /** @deprecated 使用 resolveAtPickup(order) 代替。保留字段用于数据兼容。 */
  atPickup?: boolean;
  currentStopIndex?: number;         // 当前经停点序号（整车多站卸货时推进）
  origin?: Location;                 // 仅物流配送
  destination?: Location;            // 仅物流配送
  stops?: RouteStop[];               // 路线经停点（仅整车配送）
  ltlWaybills?: LTLWaybill[];        // 运单列表（散件直送）
  ftlWaybills?: FTLWaybill[];        // 整车运单列表（整车配送，一订多车时在此展开）
  compartments?: Compartment[];      // 格口分配（仅散件直送）
  senderName?: string;                // 发货人（兼容旧数据）
  senderPhone?: string;               // 发货人电话（兼容旧数据）
  senderAddress?: Location | string;    // 发货地址（兼容旧数据）
  receiverName?: string;              // 收货人（兼容旧数据）
  receiverPhone?: string;             // 收货人电话（兼容旧数据）
  receiverAddress?: Location | string;  // 收货地址（兼容旧数据）
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
