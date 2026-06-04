import type { OrderStatus, Location, ServiceType } from './order';

// 追踪步骤
export interface TrackingStep {
  status: OrderStatus;
  label: string;
  description: string;
  time?: string;
  completed: boolean;
  current: boolean;
}

// 追踪信息
export interface TrackingInfo {
  orderId: string;
  vehicleId: string;
  vehicleLocation: Location;
  destination: Location;
  route: Location[];            // 路线轨迹点
  remainingDistance: number;    // km
  remainingTime: number;       // 分钟
  timeline: TrackingStep[];
  // 交互操作（根据服务类型和状态变化）
  availableActions: TrackingAction[];
}

// 追踪页可操作动作（按服务类型区分）
export type TrackingAction =
  // 物流配送
  | 'load_goods'          // 装货
  | 'unload_goods'        // 卸货
  | 'self_pickup'         // 自助取件
  | 'self_collect'        // 自助收件
  // 巡游贩卖
  | 'start_trip'          // 开始行程
  | 'end_trip'            // 结束行程
  | 'start_stop_trip'     // 开始/结束行程（互切按钮）
  | 'start_selling'       // 开始贩卖
  | 'end_selling'         // 结束贩卖
  | 'start_stop_selling'  // 开始/暂停贩卖（互切按钮）
  | 'pause_selling'       // 暂停贩卖
  | 'cargo_operation'     // 货物操作
  // 安防巡检
  | 'material_operation'  // 物资操作
  | 'supply_operation'    // 补给操作
  | 'device_test'         // 设备测试
  // 通用
  | 'route_plan'          // 路线规划
  | 'view_tracking'       // 查看追踪（跳转跟踪页）
  | 'contact_service'     // 联系客服
  | 'cancel_order';       // 取消订单

// 操作按钮状态
export type ActionButtonState = 'active' | 'disabled' | 'hidden';

// 操作按钮配置
export interface ActionButtonConfig {
  action: TrackingAction;
  label: string;
  state: ActionButtonState;
}

// 安防告警
export interface SecurityAlert {
  id: string;
  type: 'intrusion' | 'fire' | 'equipment' | 'abnormal_behavior' | 'other';
  level: 'low' | 'medium' | 'high';
  message: string;
  location: string;
  timestamp: string;
  resolved: boolean;
}
