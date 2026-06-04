import type { ServiceType, CargoType, SpecialRequirement, RentalPlan } from '@/types';

export interface ServiceConfig {
  type: ServiceType;
  label: string;
  tabLabel: string;        // Tab栏显示名
  description: string;
  color: string;
  bgColor: string;
  vehicleImage: string;    // 车辆照片路径
}

export const SERVICES: Record<ServiceType, ServiceConfig> = {
  logistics: {
    type: 'logistics',
    label: '配送下单',
    tabLabel: '物流配送',
    description: '整车/零担',
    color: '#1677FF',
    bgColor: '#E6F0FF',
    vehicleImage: '/vehicle-delivery.jfif',
  },
  vending: {
    type: 'vending',
    label: '巡游租车',
    tabLabel: '巡游贩卖',
    description: '贩卖/安防',
    color: '#52C41A',
    bgColor: '#F0FFF0',
    vehicleImage: '/vehicle-vending.png',
  },
  security: {
    type: 'security',
    label: '安防巡检',
    tabLabel: '安防巡检',
    description: '巡逻监控',
    color: '#FAAD14',
    bgColor: '#FFFBE6',
    vehicleImage: '/vehicle-security.png',
  },
};

// 状态标签配置
export const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: '#999999' },
  pricing: { label: '计费中', color: '#1677FF' },
  paying: { label: '待支付', color: '#FAAD14' },
  dispatching: { label: '调度中', color: '#1677FF' },
  picked_up: { label: '已出发', color: '#1677FF' },
  in_transit: { label: '运输中', color: '#1677FF' },
  arrived: { label: '已到达', color: '#52C41A' },
  unloading: { label: '卸货中', color: '#1677FF' },
  loading: { label: '装货中', color: '#1677FF' },
  selling: { label: '贩卖中', color: '#52C41A' },
  paused: { label: '已暂停', color: '#FAAD14' },
  patrolling: { label: '巡检中', color: '#1677FF' },
  completed: { label: '已完成', color: '#52C41A' },
  cancelled: { label: '已取消', color: '#FF4D4F' },
};

// 颜色主题常量
export const COLORS = {
  primary: '#1677FF',
  primaryLight: '#E6F0FF',
  background: '#F5F6FA',
  card: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textPlaceholder: '#999999',
  success: '#52C41A',
  warning: '#FAAD14',
  danger: '#FF4D4F',
  border: '#EEEEEE',
  divider: '#F0F0F0',
} as const;

// ─── 货物类型配置 ────────────────────────────

export const CARGO_TYPES: { key: CargoType; label: string }[] = [
  { key: 'daily_necessities', label: '日用品/快速消费品' },
  { key: 'fresh_cold_chain', label: '生鲜/冷链食品' },
  { key: 'electronics', label: '电子设备' },
  { key: 'documents', label: '文件/包裹' },
  { key: 'furniture', label: '家具/大件' },
  { key: 'other', label: '其他' },
];

export const SPECIAL_REQUIREMENTS: { key: SpecialRequirement; label: string; icon: string }[] = [
  { key: 'cold_chain', label: '冷链运输', icon: '❄️' },
  { key: 'fragile', label: '易碎品', icon: '⚠️' },
  { key: 'oversized', label: '超大件', icon: '📦' },
  { key: 'hazardous', label: '危险品', icon: '🔴' },
];

// ─── 安防巡检租赁套餐 ────────────────────────────

export const SECURITY_RENTAL_PLANS: RentalPlan[] = [
  { id: 'rp_1m', label: '1个月', months: 1, pricePerDay: 160, totalPrice: 4800, discount: '' },
  { id: 'rp_3m', label: '3个月', months: 3, pricePerDay: 150, totalPrice: 13500, discount: '9.5折' },
  { id: 'rp_6m', label: '6个月', months: 6, pricePerDay: 140, totalPrice: 25200, discount: '9折' },
];

// ─── 推荐路线（路线规划页用） ────────────────────────────

export interface RecommendedRoute {
  id: string;
  name: string;
  stops: number;
  duration: string;
  distance: string;
  serviceType: 'vending' | 'security';
  waypoints: { name: string; duration: number }[];
}

export const RECOMMENDED_ROUTES: RecommendedRoute[] = [
  {
    id: 'rr_v1', name: '西湖环线', stops: 5, duration: '2.5小时', distance: '12km', serviceType: 'vending',
    waypoints: [
      { name: '湖滨步行街', duration: 25 },
      { name: '断桥残雪', duration: 15 },
      { name: '孤山公园', duration: 20 },
      { name: '苏堤春晓', duration: 30 },
      { name: '雷峰塔', duration: 20 },
    ],
  },
  {
    id: 'rr_v2', name: '商圈巡回线', stops: 4, duration: '2小时', distance: '8km', serviceType: 'vending',
    waypoints: [
      { name: '银泰百货', duration: 25 },
      { name: '万达广场', duration: 30 },
      { name: '龙湖天街', duration: 25 },
      { name: '印象城', duration: 20 },
    ],
  },
  {
    id: 'rr_s1', name: '园区巡逻线', stops: 6, duration: '3小时', distance: '15km', serviceType: 'security',
    waypoints: [
      { name: 'A栋大堂', duration: 10 },
      { name: 'B2停车场', duration: 15 },
      { name: 'C区花园', duration: 10 },
      { name: 'D栋后门', duration: 10 },
      { name: 'E区仓库', duration: 15 },
      { name: '主入口岗亭', duration: 10 },
    ],
  },
  {
    id: 'rr_s2', name: '社区安防线', stops: 4, duration: '2小时', distance: '10km', serviceType: 'security',
    waypoints: [
      { name: '东门入口', duration: 10 },
      { name: '中心花园', duration: 15 },
      { name: '地下车库', duration: 15 },
      { name: '西门出口', duration: 10 },
    ],
  },
];

// ─── 车型配置 ────────────────────────────

export const LOGISTICS_VEHICLE_MODELS = [
  { id: 'lm_z2', name: 'Z2 小型配送车', loadCapacity: 300, cargoVolume: 2, range: 110, maxSpeed: 30, description: '封闭园区、社区窄路', imageUrl: '/vehicle-delivery.jfif' },
  { id: 'lm_z5', name: 'Z5 中型配送车', loadCapacity: 800, cargoVolume: 5, range: 180, maxSpeed: 40, description: '城市物流主干道', imageUrl: '/vehicle-delivery.jfif' },
  { id: 'lm_x3', name: 'X3 紧凑配送车', loadCapacity: 500, cargoVolume: 3, range: 100, maxSpeed: 60, description: '窄路运输、快递接驳', imageUrl: '/vehicle-delivery.jfif' },
  { id: 'lm_x6', name: 'X6 标准配送车', loadCapacity: 800, cargoVolume: 6, range: 200, maxSpeed: 60, description: '城市配送、冷链', imageUrl: '/vehicle-delivery.jfif' },
  { id: 'lm_p3', name: 'P3 模块配送车', loadCapacity: 800, cargoVolume: 3, range: 150, maxSpeed: 40, description: '原子柜分离、精准对接', imageUrl: '/vehicle-delivery.jfif' },
] as const;

export const VENDING_VEHICLE_MODELS = [
  { id: 'vm_std', name: '标准贩卖车', shelfLayers: 4, compatiblePackages: ['vp_basic', 'vp_drink'], description: '商圈步行街、社区', imageUrl: '/vehicle-vending.png' },
  { id: 'vm_large', name: '大型贩卖车', shelfLayers: 6, compatiblePackages: ['vp_full', 'vp_cold'], description: '大型社区、园区', imageUrl: '/vehicle-vending.png' },
  { id: 'vm_drink', name: '饮品专车', shelfLayers: 8, compatiblePackages: ['vp_hotcold', 'vp_beverage'], description: '景区、夏季户外', imageUrl: '/vehicle-vending.png' },
] as const;

export const SECURITY_VEHICLE_MODELS = [
  { id: 'sm_basic', name: '基础巡检车', patrolRange: 5, compatiblePackages: ['sp_basic'], description: '小区、小园区', imageUrl: '/vehicle-security.png' },
  { id: 'sm_std', name: '标准巡检车', patrolRange: 10, compatiblePackages: ['sp_standard'], description: '商圈、厂区', imageUrl: '/vehicle-security.png' },
  { id: 'sm_adv', name: '高级巡检车', patrolRange: 15, compatiblePackages: ['sp_advanced'], description: '大型园区、交通枢纽', imageUrl: '/vehicle-security.png' },
] as const;

// ─── 配套套餐 ────────────────────────────

export const VENDING_PACKAGES = [
  {
    id: 'vp_basic',
    name: '基础货架套餐',
    compatibleModels: ['vm_std'],
    items: [{ name: '4层标准货架', quantity: 1 }, { name: '商品标签屏', quantity: 1 }],
    price: 5000,
  },
  {
    id: 'vp_drink',
    name: '饮品专供套餐',
    compatibleModels: ['vm_std'],
    items: [{ name: '4层冷藏货架', quantity: 1 }, { name: '温控系统', quantity: 1 }],
    price: 8000,
  },
  {
    id: 'vp_full',
    name: '全品类货架套餐',
    compatibleModels: ['vm_large'],
    items: [{ name: '6层标准货架', quantity: 1 }, { name: '商品标签屏', quantity: 2 }],
    price: 7000,
  },
  {
    id: 'vp_cold',
    name: '冷藏货架套餐',
    compatibleModels: ['vm_large'],
    items: [{ name: '6层冷藏货架', quantity: 1 }, { name: '温控系统', quantity: 2 }],
    price: 12000,
  },
  {
    id: 'vp_hotcold',
    name: '冷热双温套餐',
    compatibleModels: ['vm_drink'],
    items: [{ name: '4层冷藏+4层保温货架', quantity: 1 }, { name: '双温控系统', quantity: 1 }],
    price: 15000,
  },
  {
    id: 'vp_beverage',
    name: '饮料专供套餐',
    compatibleModels: ['vm_drink'],
    items: [{ name: '8层冷藏货架', quantity: 1 }, { name: '自动出货系统', quantity: 1 }],
    price: 13000,
  },
] as const;

export const SECURITY_PACKAGES = [
  {
    id: 'sp_basic',
    name: '基础监控套餐',
    compatibleModels: ['sm_basic'],
    items: [{ name: '1路高清摄像头', quantity: 1 }, { name: '警示灯', quantity: 1 }, { name: '语音播报', quantity: 1 }],
    price: 6000,
  },
  {
    id: 'sp_standard',
    name: '标准监控套餐',
    compatibleModels: ['sm_std'],
    items: [{ name: '2路高清摄像头', quantity: 1 }, { name: '红外夜视', quantity: 1 }, { name: '双向对讲', quantity: 1 }, { name: '警示灯', quantity: 1 }],
    price: 12000,
  },
  {
    id: 'sp_advanced',
    name: '高级监控套餐',
    compatibleModels: ['sm_adv'],
    items: [{ name: '4路高清摄像头', quantity: 1 }, { name: '热成像', quantity: 1 }, { name: '双向对讲', quantity: 1 }, { name: '显示屏', quantity: 1 }, { name: '警示灯', quantity: 1 }, { name: '声光报警', quantity: 1 }],
    price: 25000,
  },
] as const;

// ─── 可用任务清单 ────────────────────────────

export const VENDING_STOP_TASKS = [
  { id: 'vst_shelf', name: '开放货架展示', description: '到站后自动打开车厢展示商品', position: 'stop' as const },
  { id: 'vst_voice', name: '播放促销语音', description: '播放预设的促销广告', position: 'stop' as const },
  { id: 'vst_push', name: '推送优惠通知', description: '向周边APP用户推送优惠消息', position: 'stop' as const },
  { id: 'vst_led', name: 'LED屏幕展示', description: '车载屏幕展示商品信息', position: 'stop' as const },
  { id: 'vst_stock', name: '库存盘点', description: '自动清点当前库存', position: 'stop' as const },
] as const;

export const VENDING_SEGMENT_TASKS = [
  { id: 'vsg_ad', name: '循环播放广告', description: '行驶途中持续播放广告语音', position: 'segment' as const },
  { id: 'vsg_led', name: 'LED屏幕展示', description: '行驶途中屏幕展示信息', position: 'segment' as const },
] as const;

export const SECURITY_STOP_TASKS = [
  { id: 'sst_photo', name: '360°全景拍照', description: '到站后自动拍摄全景照片', position: 'stop' as const },
  { id: 'sst_device', name: '读取设备状态', description: '检查门禁/传感器等设备状态', position: 'stop' as const },
  { id: 'sst_thermal', name: '红外测温扫描', description: '热成像检测异常温度点', position: 'stop' as const },
  { id: 'sst_broadcast', name: '播报安全提示', description: '播放预设安全提示语', position: 'stop' as const },
  { id: 'sst_intercom', name: '对讲喊话', description: '通过车载对讲进行喊话', position: 'stop' as const },
] as const;

// ─── 别名导出（兼容组件中的引用） ────────────────────────────
export const DELIVERY_VEHICLES = LOGISTICS_VEHICLE_MODELS;
export const VENDING_VEHICLES = VENDING_VEHICLE_MODELS;
export const SECURITY_VEHICLES = SECURITY_VEHICLE_MODELS;

export const SECURITY_SEGMENT_TASKS = [
  { id: 'ssg_record', name: '摄像头持续录制', description: '行驶途中持续视频录制', position: 'segment' as const },
  { id: 'ssg_detect', name: '异常行为检测', description: 'AI检测异常行为并告警', position: 'segment' as const },
  { id: 'ssg_broadcast', name: '语音播报巡检提示', description: '沿途播报巡检提示', position: 'segment' as const },
] as const;
