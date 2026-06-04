import type { ServiceType, Location } from './order';
import type { SecurityAlert } from './tracking';

// 车辆状态
export type VehicleStatus = 'idle' | 'busy' | 'offline' | 'charging' | 'maintenance';

// 无人车
export interface Vehicle {
  id: string;
  name: string;
  model: string;
  type: ServiceType;
  status: VehicleStatus;
  currentLocation: Location;
  batteryLevel: number;       // 0-100
  speed: number;              // km/h
  lastUpdateTime: string;
  plateNumber?: string;       // 车牌号
  modelId?: string;           // 车型ID
  imageUrl?: string;          // 车辆照片

  // 贩卖车特有
  vendingInfo?: VendingInfo;
  // 安防车特有
  securityInfo?: SecurityInfo;
}

// 贩卖车信息
export interface VendingInfo {
  productCount: number;       // 在售商品数
  shelfStatus: ShelfStatus[];
  dailySales: number;         // 当日销售额（分）
  operatingMode: 'moving' | 'stationed'; // 即停即走 / 定点驻停
  salesTrend: { hour: string; amount: number }[]; // 销售趋势
  topProducts: { name: string; sold: number }[];   // 热销商品
}

export interface ShelfStatus {
  name: string;
  stock: number;              // 库存
  capacity: number;           // 容量
}

// 安防车信息
export interface SecurityInfo {
  cameraOnline: number;       // 在线摄像头数
  cameraTotal: number;        // 总摄像头数
  alertCount: number;         // 当日告警数
  patrolProgress: number;     // 巡检进度 0-100
  deviceStatus: SecurityDeviceStatus[];  // 设备状态列表
  recentAlerts: SecurityAlert[];         // 最近告警
  patrolReport?: PatrolReport;           // 巡检报告
}

// 巡游贩卖套餐
export interface VendingPackage {
  id: string;
  name: string;
  compatibleModels: string[];
  items: PackageItem[];
  price: number;  // 分
}

// 安防巡检套餐
export interface SecurityPackage {
  id: string;
  name: string;
  compatibleModels: string[];
  items: PackageItem[];
  price: number;  // 分
}

// 套餐项
export interface PackageItem {
  name: string;
  quantity: number;
  description?: string;
}

// 设备套餐配置
export interface EquipmentPackageConfig {
  packageId: string;
  packageName: string;
  equipmentItems: { name: string; description: string }[];
}

// 安防设备状态
export interface SecurityDeviceStatus {
  name: string;               // 设备名（如"前摄像头"、"警示灯"）
  type: 'camera' | 'light' | 'speaker' | 'screen' | 'thermometer';
  status: 'online' | 'offline' | 'error'; // 在线/离线/异常
}

// ─── 车型定义 ────────────────────────────

// 物流配送车型
export interface LogisticsVehicleModel {
  id: string;
  name: string;
  loadCapacity: number;   // kg
  cargoVolume: number;    // m³
  range: number;          // km
  maxSpeed: number;       // km/h
  description: string;
  imageUrl: string;
}

// 巡游贩卖车型
export interface VendingVehicleModel {
  id: string;
  name: string;
  shelfLayers: number;
  compatiblePackages: string[];
  description: string;
  imageUrl: string;
}

// 安防巡检车型
export interface SecurityVehicleModel {
  id: string;
  name: string;
  patrolRange: number;    // km/次
  compatiblePackages: string[];
  description: string;
  imageUrl: string;
}

// 通用车型（联合类型）
export type VehicleModel = LogisticsVehicleModel | VendingVehicleModel | SecurityVehicleModel;

// 配套套餐
export interface PackageConfig {
  id: string;
  name: string;
  compatibleModels: string[];
  items: { name: string; quantity: number }[];
  equipmentItems?: { name: string; description: string }[];
  price: number;          // 分
}

// 巡检报告
export interface PatrolReport {
  id: string;
  orderId: string;
  summary: string;
  totalDistance: number;       // km
  duration: number;           // 分钟
  pointsChecked: number;
  issuesFound: number;
  generatedAt: string;
}
