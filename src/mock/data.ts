import type { Order, Vehicle, User, TrackingInfo, AppNotification, RoutePlan } from '@/types'
import { computeLTLCarGroups, buildLTLCompartments } from '@/lib/ltl-car-groups'

// ═══ 演示账号 ═══

export const MOCK_USER: User = {
  id: 'demo_user',
  name: '演示用户',
  phone: '138****8888',
  avatar: '',
  organization: {
    id: 'org_demo',
    name: '北京智慧物流有限公司',
    type: 'logistics',
    contactName: '李经理',
    contactPhone: '010-88886666',
  },
  balance: 500000, // 5000元
  createdAt: '2025-05-01T10:00:00Z',
}

// ═══ 车辆（5 辆） ═══

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'v_001',
    name: '无人车 A-001',
    plateNumber: '京A·UV001',
    model: 'Z5 中型配送车',
    modelId: 'lm_z5',
    type: 'logistics',
    status: 'busy',
    currentLocation: { lat: 39.9142, lng: 116.4174, address: '朝阳区三里屯' },
    batteryLevel: 72,
    speed: 25,
    lastUpdateTime: new Date().toISOString(),
  },
  {
    id: 'v_002',
    name: '无人车 A-002',
    plateNumber: '京A·UV002',
    model: 'Z2 小型配送车',
    modelId: 'lm_z2',
    type: 'logistics',
    status: 'busy',
    currentLocation: { lat: 39.9042, lng: 116.4074, address: '朝阳区望京SOHO' },
    batteryLevel: 88,
    speed: 0,
    lastUpdateTime: new Date().toISOString(),
  },
  {
    id: 'v_003',
    name: '无人车 B-023',
    plateNumber: '京B·VB023',
    model: '标准贩卖车',
    modelId: 'vm_std',
    type: 'vending',
    status: 'busy',
    currentLocation: { lat: 39.9142, lng: 116.3974, address: '海淀区中关村广场' },
    batteryLevel: 85,
    speed: 15,
    lastUpdateTime: new Date().toISOString(),
    vendingInfo: {
      productCount: 12,
      operatingMode: 'moving',
      shelfStatus: [
        { name: '饮料', stock: 35, capacity: 50 },
        { name: '零食', stock: 20, capacity: 40 },
        { name: '水果', stock: 5, capacity: 20 },
      ],
      dailySales: 156000,
      salesTrend: [
        { hour: '09:00', amount: 12000 }, { hour: '10:00', amount: 28000 },
        { hour: '11:00', amount: 35000 }, { hour: '12:00', amount: 41000 },
        { hour: '13:00', amount: 28000 }, { hour: '14:00', amount: 12000 },
      ],
      topProducts: [
        { name: '可口可乐', sold: 18 }, { name: '农夫山泉', sold: 15 },
        { name: '薯片', sold: 12 }, { name: '苹果', sold: 8 },
      ],
    },
  },
  {
    id: 'v_004',
    name: '无人车 S-007',
    plateNumber: '京S·SP007',
    model: '标准巡检车',
    modelId: 'sm_std',
    type: 'security',
    status: 'busy',
    currentLocation: { lat: 39.9070, lng: 116.4190, address: '朝阳区A栋大堂' },
    batteryLevel: 58,
    speed: 8,
    lastUpdateTime: new Date().toISOString(),
    securityInfo: {
      cameraOnline: 3,
      cameraTotal: 4,
      alertCount: 1,
      patrolProgress: 45,
      deviceStatus: [
        { name: '高清摄像头', type: 'camera' as const, status: 'online' as const },
        { name: '红外夜视', type: 'camera' as const, status: 'online' as const },
        { name: '双向对讲', type: 'speaker' as const, status: 'online' as const },
        { name: '警示灯', type: 'light' as const, status: 'online' as const },
      ],
      recentAlerts: [
        { id: 'a_001', type: 'intrusion' as const, level: 'high' as const, message: 'B2栋走廊检测到异常人员', location: 'B2栋走廊', timestamp: new Date().toISOString(), resolved: false },
      ],
    },
  },
  {
    id: 'v_005',
    name: '无人车 A-015',
    plateNumber: '京A·UV015',
    model: 'X3 紧凑配送车',
    modelId: 'lm_x3',
    type: 'logistics',
    status: 'idle',
    currentLocation: { lat: 39.9082, lng: 116.4274, address: '东城区王府井大街' },
    batteryLevel: 100,
    speed: 0,
    lastUpdateTime: new Date().toISOString(),
  },
]

// ═══ 订单（8 条：4 在途 + 4 已完成/取消） ═══

const NOW = new Date().toISOString()
const HOUR_AGO = new Date(Date.now() - 3600000).toISOString()
const DAY_AGO = new Date(Date.now() - 86400000).toISOString()

// DEMO-003 散件直送运单（供 buildLTLCompartments 重新生成 compartments）
// 模拟用户已完成投件操作，每条运单带一条投件交接记录
const DEMO_003_WAYBILLS = [
  {
    id: 'WB-001', orderId: 'DEMO-003', compartmentId: '',
    pickupAddress: '朝阳区望京SOHO T3', pickupContactName: '陈主管', pickupContactPhone: '132****1111',
    deliveryAddress: '海淀区五道口华联', deliveryContactName: '刘先生', deliveryContactPhone: '130****2222',
    cargoItems: [{ name: '日用百货', quantity: 8, weight: 50 }, { name: '生鲜食品', quantity: 3, weight: 30 }],
    cargoDescription: '日用百货 8箱 + 生鲜 3箱', cargoWeight: 80,
    status: 'assigned' as const, pickupCode: '382761', deliveryCode: '591403',
    createdAt: HOUR_AGO, updatedAt: NOW,
  },
  {
    id: 'WB-002', orderId: 'DEMO-003', compartmentId: '',
    pickupAddress: '朝阳区望京SOHO T3', pickupContactName: '陈主管', pickupContactPhone: '132****1111',
    deliveryAddress: '海淀区清华科技园', deliveryContactName: '张经理', deliveryContactPhone: '138****9012',
    cargoItems: [{ name: '办公耗材', quantity: 2, weight: 8 }],
    cargoDescription: '办公耗材 2箱', cargoWeight: 8,
    status: 'assigned' as const, pickupCode: '749201', deliveryCode: '284610',
    createdAt: HOUR_AGO, updatedAt: NOW,
  },
  {
    id: 'WB-003', orderId: 'DEMO-003', compartmentId: '',
    pickupAddress: '朝阳区望京SOHO T3', pickupContactName: '陈主管', pickupContactPhone: '132****1111',
    deliveryAddress: '海淀区中关村创业大街', deliveryContactName: '李女士', deliveryContactPhone: '137****3456',
    cargoItems: [{ name: '文件包裹', quantity: 1, weight: 3 }],
    cargoDescription: '文件包裹 1件', cargoWeight: 3,
    status: 'assigned' as const, pickupCode: '135792', deliveryCode: '468013',
    createdAt: HOUR_AGO, updatedAt: NOW,
  },
]

// DEMO-003 拼车计算
const demo003Groups = computeLTLCarGroups(DEMO_003_WAYBILLS)
const demo003Result = buildLTLCompartments(DEMO_003_WAYBILLS, demo003Groups)

export const MOCK_ORDERS: Order[] = [
  // ── 1. 整车配送 · 已调度（1订2车：同一装货点 → 两车分别送往两个卸货点） ──
  {
    id: 'DEMO-001',
    serviceType: 'logistics',
    status: 'dispatched',
    deliveryMode: 'full_load',
    vehicleModel: 'Z5 中型配送车',
    vehicleId: 'v_001',
    vehicleName: '无人车 A-001',
    vehicleImage: '/vehicle-delivery.png',
    vehiclePlate: '京A·UV001',
    vehicleBattery: 72,
    stops: [],  // 已废弃，数据在 ftlWaybills
    ftlWaybills: [
      {
        id: 'FTL-001', vehicleModelId: 'lm_z5', vehicleModelName: 'Z5 中型配送车',
        vehicleId: 'v_001', vehiclePlate: '京A·UV001', vehicleBattery: 72,
        stops: [
          { id: 'stop-001-1', type: 'pickup', stopStatus: 'pending' as const, address: '朝阳区望京SOHO T1', contactName: '王经理', contactPhone: '139****1234', cargoDescription: '电子配件 8箱', cargoWeight: 80, sequence: 0 },
          { id: 'stop-001-2', type: 'delivery', stopStatus: 'pending' as const, address: '海淀区中关村软件园二期', contactName: '赵女士', contactPhone: '136****5678', cargoDescription: '电子配件 8箱', cargoWeight: 80, sequence: 1, timeWindow: '14:00-14:30' },
        ],
        cargoDescription: '电子配件 8箱', cargoWeight: 80, status: 'in_progress',
        createdAt: HOUR_AGO, updatedAt: NOW,
      },
      {
        id: 'FTL-002', vehicleModelId: 'lm_x3', vehicleModelName: 'X3 城配',
        vehicleId: 'v_005', vehiclePlate: '京A·UV015', vehicleBattery: 68,
        stops: [
          { id: 'stop-001-3', type: 'pickup', stopStatus: 'pending' as const, address: '朝阳区望京SOHO T1', contactName: '王经理', contactPhone: '139****1234', cargoDescription: '电子配件 4箱', cargoWeight: 40, sequence: 0 },
          { id: 'stop-001-4', type: 'delivery', stopStatus: 'pending' as const, address: '海淀区五道口华联', contactName: '刘先生', contactPhone: '130****2222', cargoDescription: '电子配件 4箱', cargoWeight: 40, sequence: 1, timeWindow: '15:00-15:30' },
        ],
        cargoDescription: '电子配件 4箱', cargoWeight: 40, status: 'in_progress',
        createdAt: HOUR_AGO, updatedAt: NOW,
      },
    ],
    senderName: '王经理',
    senderPhone: '139****1234',
    senderAddress: '朝阳区望京SOHO T1',
    receiverName: '赵女士',
    receiverPhone: '136****5678',
    receiverAddress: '海淀区中关村软件园二期',
    cargoInfo: '电子配件 12箱（分2车）',
    cargoType: 'electronics',
    cargoWeight: 120,
    specialRequirements: ['fragile'],
    origin: { lat: 39.9042, lng: 116.4074, address: '朝阳区望京SOHO T1' },
    destination: { lat: 39.9542, lng: 116.4574, address: '海淀区中关村软件园二期' },
    estimatedTime: 35,
    estimatedCost: 1800,
    amount: 1800,
    remainingDistance: 11.2,
    remainingTime: 18,
    createdAt: HOUR_AGO,
    updatedAt: NOW,
  },

  // ── 2. 整车配送 · 已完成（1订1车，ftlWaybills 格式） ──
  {
    id: 'DEMO-002',
    serviceType: 'logistics',
    status: 'completed',
    deliveryMode: 'full_load',
    vehicleModel: 'X3 城配',
    vehicleId: 'v_005',
    vehicleName: '无人车 A-015',
    vehicleImage: '/vehicle-delivery.png',
    vehiclePlate: '京A·UV015',
    stops: [],  // 已废弃，数据在 ftlWaybills
    ftlWaybills: [
      {
        id: 'FTL-003', vehicleModelId: 'lm_x3', vehicleModelName: 'X3 城配',
        vehicleId: 'v_005', vehiclePlate: '京A·UV015', vehicleBattery: 100,
        stops: [
          { id: 'stop-002-1', type: 'pickup', stopStatus: 'completed' as const, address: '朝阳区望京SOHO T2', contactName: '孙经理', contactPhone: '133****5555', cargoDescription: '办公耗材 5箱', cargoWeight: 30, sequence: 0 },
          { id: 'stop-002-2', type: 'delivery', stopStatus: 'completed' as const, address: '东城区东直门外大街', contactName: '周先生', contactPhone: '131****6666', cargoDescription: '办公耗材 5箱', cargoWeight: 30, sequence: 1 },
        ],
        cargoDescription: '办公耗材 5箱', cargoWeight: 30, status: 'completed',
        createdAt: DAY_AGO, updatedAt: DAY_AGO, completedAt: DAY_AGO,
      },
    ],
    senderName: '孙经理',
    senderPhone: '133****5555',
    senderAddress: '朝阳区望京SOHO T2',
    receiverName: '周先生',
    receiverPhone: '131****6666',
    receiverAddress: '东城区东直门外大街',
    cargoInfo: '办公耗材 5箱',
    cargoType: 'documents',
    cargoWeight: 30,
    origin: { lat: 39.9042, lng: 116.4074, address: '朝阳区望京SOHO T2' },
    destination: { lat: 39.9242, lng: 116.4474, address: '东城区东直门外大街' },
    estimatedTime: 25,
    estimatedCost: 650,
    amount: 620,
    paymentMethod: 'balance',
    createdAt: DAY_AGO,
    updatedAt: DAY_AGO,
    completedAt: DAY_AGO,
  },

  // ── 3. 散件直送 · 投件中（1订3单：3运单拼1车） ──
  {
    id: 'DEMO-003',
    serviceType: 'logistics',
    status: 'dispatched',
    deliveryMode: 'ltl',
    vehicleModel: 'Z2 小型配送车',
    vehicleId: 'v_002',
    vehicleName: '无人车 A-002',
    vehicleImage: '/vehicle-delivery.png',
    vehiclePlate: demo003Result.vehiclePlates[0],
    vehicleBattery: 88,
    ltlWaybills: demo003Result.assignedWaybills,
    compartments: demo003Result.compartments,
    senderName: '陈主管',
    senderPhone: '132****1111',
    senderAddress: '朝阳区望京SOHO T3',
    receiverName: '刘先生',
    receiverPhone: '130****2222',
    receiverAddress: '海淀区五道口华联',
    cargoInfo: '3票货物（日用品/耗材/文件）',
    cargoType: 'daily_necessities',
    cargoWeight: 91,
    specialRequirements: ['cold_chain'],
    origin: { lat: 39.9042, lng: 116.4074, address: '朝阳区望京SOHO T3' },
    destination: { lat: 39.9192, lng: 116.3874, address: '海淀区五道口华联' },
    estimatedTime: 30,
    estimatedCost: 450,
    amount: 450,
    remainingDistance: 18.2,
    remainingTime: 35,
    createdAt: HOUR_AGO,
    updatedAt: NOW,
  },

  // ── 4. 散件直送 · 已完成 ──
  (() => {
    const wbs: import('@/types').LTLWaybill[] = [{
      id: 'WB-004', orderId: 'DEMO-004', compartmentId: 'COMP-DEMO004-A',
      pickupAddress: '海淀区中关村软件园', pickupContactName: '吴经理', pickupContactPhone: '134****3333',
      deliveryAddress: '朝阳区国贸大厦', deliveryContactName: '郑女士', deliveryContactPhone: '135****4444',
      cargoItems: [{ name: '文件包裹', quantity: 3, weight: 5 }],
      cargoDescription: '文件包裹 3件', cargoWeight: 5,
      status: 'completed', pickupCode: '482910', deliveryCode: '719305',
      createdAt: DAY_AGO, updatedAt: DAY_AGO,
    }];
    const groups = computeLTLCarGroups(wbs, 3);
    const result = buildLTLCompartments(wbs, groups);
    return {
      id: 'DEMO-004',
      serviceType: 'logistics' as const,
      status: 'completed' as const,
      deliveryMode: 'ltl' as const,
      vehicleModel: 'Z2 小型配送车',
      vehicleId: result.vehiclePlates[0],
      vehicleName: '无人车 A-002',
      vehicleImage: '/vehicle-delivery.png',
      vehiclePlate: result.vehiclePlates[0],
      ltlWaybills: result.assignedWaybills,
      compartments: result.compartments,
      senderName: '吴经理',
      senderPhone: '134****3333',
      senderAddress: '海淀区中关村软件园',
      receiverName: '郑女士',
      receiverPhone: '135****4444',
      receiverAddress: '朝阳区国贸大厦',
      cargoInfo: '文件包裹 3件',
      cargoType: 'documents' as const,
      cargoWeight: 5,
      origin: { lat: 39.9542, lng: 116.4574, address: '海淀区中关村软件园' },
      destination: { lat: 39.9087, lng: 116.4586, address: '朝阳区国贸大厦' },
      estimatedTime: 40,
      estimatedCost: 280,
      amount: 260,
      paymentMethod: 'wechat' as const,
      createdAt: DAY_AGO,
      updatedAt: DAY_AGO,
      completedAt: DAY_AGO,
    };
  })(),

  // ── 5. 巡游贩卖 · 贩卖中 ──
  {
    id: 'DEMO-005',
    serviceType: 'vending',
    status: 'selling',
    cruiseType: 'vending',
    vehicleModel: '标准贩卖车',
    vehicleId: 'v_003',
    vehicleName: '无人车 B-023',
    vehicleImage: '/vehicle-vending.png',
    vehiclePlate: '京B·VB023',
    vehicleBattery: 85,
    vehicleCount: 1,
    duration: 8,
    equipmentPackageId: 'vp_basic',
    packageName: '基础货架套餐',
    pickupLocation: '海淀区中关村广场',
    pickupContact: '陈店长',
    pickupPhone: '135****9876',
    routePlanId: 'rp_demo_vending',
    estimatedTime: 480,
    estimatedCost: 2400,
    amount: 2400,
    createdAt: HOUR_AGO,
    updatedAt: NOW,
  },

  // ── 6. 巡游贩卖 · 已完成 ──
  {
    id: 'DEMO-006',
    serviceType: 'vending',
    status: 'completed',
    cruiseType: 'vending',
    vehicleModel: '智能零售专车',
    vehicleId: 'v_003',
    vehicleName: '无人车 B-023',
    vehicleImage: '/vehicle-vending.png',
    vehiclePlate: '京B·VB023',
    vehicleCount: 1,
    duration: 6,
    equipmentPackageId: 'vp_full',
    packageName: '全品类货架套餐',
    pickupLocation: '海淀区中关村广场',
    pickupContact: '陈店长',
    pickupPhone: '135****9876',
    estimatedTime: 360,
    estimatedCost: 1800,
    amount: 1800,
    paymentMethod: 'invoice',
    createdAt: DAY_AGO,
    updatedAt: DAY_AGO,
    completedAt: DAY_AGO,
  },

  // ── 7. 安防巡检 · 巡检中 ──
  {
    id: 'DEMO-007',
    serviceType: 'security',
    status: 'patrolling',
    cruiseType: 'security',
    vehicleModel: '标准巡检车',
    vehicleId: 'v_004',
    vehicleName: '无人车 S-007',
    vehicleImage: '/vehicle-security.png',
    vehiclePlate: '京S·SP007',
    vehicleBattery: 58,
    vehicleCount: 1,
    duration: 12,
    equipmentPackageId: 'sp_standard',
    packageName: '标准监控套餐',
    pickupLocation: '朝阳区建国门外大街',
    pickupContact: '安保部 刘主管',
    pickupPhone: '137****4321',
    routePlanId: 'rp_demo_security',
    estimatedTime: 720,
    estimatedCost: 3600,
    amount: 3600,
    createdAt: HOUR_AGO,
    updatedAt: NOW,
  },

  // ── 8. 安防巡检 · 已取消 ──
  {
    id: 'DEMO-008',
    serviceType: 'security',
    status: 'cancelled',
    cruiseType: 'security',
    vehicleModel: '基础巡检车',
    vehicleId: 'v_004',
    vehicleName: '无人车 S-007',
    vehicleImage: '/vehicle-security.png',
    vehiclePlate: '京S·SP007',
    vehicleCount: 2,
    duration: 24,
    equipmentPackageId: 'sp_basic',
    packageName: '基础监控套餐',
    pickupLocation: '朝阳区建国门外大街',
    pickupContact: '安保部 刘主管',
    pickupPhone: '137****4321',
    estimatedTime: 1440,
    estimatedCost: 7200,
    amount: 7200,
    createdAt: DAY_AGO,
    updatedAt: DAY_AGO,
  },
]

// ═══ 追踪数据（4 条在途订单） ═══

export const MOCK_TRACKING: Record<string, TrackingInfo> = {
  // ── DEMO-001 整车配送 · 已调度（1→2 经停点） ──
  'DEMO-001': {
    orderId: 'DEMO-001',
    vehicleId: 'v_001',
    vehicleLocation: { lat: 39.9142, lng: 116.4174, address: '朝阳区花家地' },
    destination: { lat: 39.9042, lng: 116.4074, address: '朝阳区望京SOHO T1' },
    route: [
      { lat: 39.9042, lng: 116.4074, address: '望京SOHO T1（装货点）' },
      { lat: 39.9242, lng: 116.4274, address: '北三环' },
      { lat: 39.9342, lng: 116.4374, address: '安定门' },
      { lat: 39.9442, lng: 116.4474, address: '北土城' },
      { lat: 39.9542, lng: 116.4574, address: '中关村软件园二期（卸货点 1/2）' },
      { lat: 39.9192, lng: 116.3874, address: '五道口华联（卸货点 2/2）' },
    ],
    remainingDistance: 15.8,
    remainingTime: 25,
    timeline: [
      { status: 'dispatched', label: '已调度', description: '车辆已分配，正前往望京SOHO T1装货', time: '13:30', completed: true, current: true },
      { status: 'arrived', label: '到达装货点', description: '望京SOHO T1 — 请开始装货', completed: false, current: false },
      { status: 'loading', label: '装货中', description: '望京SOHO T1 — 电子配件 12箱', completed: false, current: false },
      { status: 'in_transit', label: '运输中', description: '已发车，前往第1站：中关村软件园二期', completed: false, current: false },
      { status: 'arrived', label: '到达卸货点 1', description: '中关村软件园二期 — 电子配件 8箱', completed: false, current: false },
      { status: 'unloading', label: '卸货中', description: '中关村软件园二期卸货中', completed: false, current: false },
      { status: 'arrived', label: '到达卸货点 2', description: '五道口华联 — 电子配件 4箱', completed: false, current: false },
      { status: 'unloading', label: '卸货中', description: '五道口华联卸货中', completed: false, current: false },
      { status: 'completed', label: '已签收', description: '全部卸货完成，订单完结', completed: false, current: false },
    ],
    availableActions: ['route_plan', 'contact_service'],
  },

  // ── DEMO-003 散件直送 · 已调度（1订3单拼车，3运单待投件） ──
  'DEMO-003': {
    orderId: 'DEMO-003',
    vehicleId: 'v_002',
    vehicleLocation: { lat: 39.9092, lng: 116.4124, address: '朝阳区花家地' },
    destination: { lat: 39.9042, lng: 116.4074, address: '朝阳区望京SOHO T3' },
    route: [
      { lat: 39.9042, lng: 116.4074, address: '望京SOHO T3（投件点）' },
      { lat: 39.9092, lng: 116.4124, address: '花家地' },
      { lat: 39.9142, lng: 116.4024, address: '知春路' },
      { lat: 39.9192, lng: 116.3874, address: '五道口华联（取件点 WB-001）' },
      { lat: 39.9242, lng: 116.3824, address: '清华科技园（取件点 WB-002）' },
      { lat: 39.9292, lng: 116.3774, address: '中关村创业大街（取件点 WB-003）' },
    ],
    remainingDistance: 18.2,
    remainingTime: 35,
    timeline: [
      { status: 'dispatched', label: '已调度', description: '3张运单已拼车分配格口，正前往投件点', time: '13:30', completed: true, current: true },
      { status: 'arrived', label: '到达投件点', description: '望京SOHO T3 — 请依次投件（A/B/C舱）', completed: false, current: false },
      { status: 'picking_up', label: '投件中', description: '投件进行中，已投 0/3 运单', completed: false, current: false },
      { status: 'in_transit', label: '运输中', description: '全部投件完成，出发依次取件', completed: false, current: false },
      { status: 'arrived', label: '到达取件点', description: '五道口华联 — WB-001 取件', completed: false, current: false },
      { status: 'completed', label: '已完成', description: '3张运单全部取件完成', completed: false, current: false },
    ],
    availableActions: ['route_plan', 'contact_service'],
  },

  // ── DEMO-005 巡游贩卖 · 贩卖中 ──
  'DEMO-005': {
    orderId: 'DEMO-005',
    vehicleId: 'v_003',
    vehicleLocation: { lat: 39.9100, lng: 116.3990, address: '海淀区知春路' },
    destination: { lat: 39.9680, lng: 116.4100, address: '朝阳区太阳宫' },
    route: [
      { lat: 39.9142, lng: 116.3974, address: '中关村广场' },
      { lat: 39.9042, lng: 116.4074, address: '望京SOHO' },
      { lat: 39.9100, lng: 116.4600, address: '三元桥' },
      { lat: 39.9680, lng: 116.4100, address: '太阳宫' },
      { lat: 39.9142, lng: 116.3974, address: '返回中关村广场' },
    ],
    remainingDistance: 8.3,
    remainingTime: 45,
    timeline: [
      { status: 'started', label: '已就位', description: '车辆已到达中关村广场，就位待命', time: '09:00', completed: true, current: false },
      { status: 'selling', label: '贩卖中', description: '车辆正在知春路巡游售卖', time: '09:30', completed: false, current: true },
	      { status: 'arrived', label: '车辆返回', description: '车辆返回出发点，请取回商品和设备', completed: false, current: false },
	      { status: 'completed', label: '服务结束', description: '商品已取回，订单完成', completed: false, current: false },
    ],
    availableActions: ['start_stop_trip', 'start_stop_selling', 'pause_selling', 'cargo_operation', 'route_plan', 'contact_service'],
  },

  // ── DEMO-007 安防巡检 · 巡检中 ──
  'DEMO-007': {
    orderId: 'DEMO-007',
    vehicleId: 'v_004',
    vehicleLocation: { lat: 39.9070, lng: 116.4190, address: '朝阳区A栋大堂' },
    destination: { lat: 39.9092, lng: 116.4174, address: '朝阳区建国门外大街' },
    route: [
      { lat: 39.9092, lng: 116.4174, address: '建国门外大街' },
      { lat: 39.9080, lng: 116.4180, address: '东门入口' },
      { lat: 39.9070, lng: 116.4190, address: 'A栋大堂' },
      { lat: 39.9060, lng: 116.4200, address: 'B栋连廊' },
      { lat: 39.9050, lng: 116.4210, address: '地下车库' },
      { lat: 39.9095, lng: 116.4160, address: '西门充电桩' },
      { lat: 39.9092, lng: 116.4174, address: '返回' },
    ],
    remainingDistance: 3.1,
    remainingTime: 28,
    timeline: [
      { status: 'started', label: '已就位', description: '车辆已到达建国门外大街，就位待命', time: '08:00', completed: true, current: false },
      { status: 'patrolling', label: '巡检中', description: '正在A栋大堂执行巡检任务', time: '08:30', completed: false, current: true },
	      { status: 'arrived', label: '车辆返回', description: '车辆返回出发点，请交接物资装备', completed: false, current: false },
	      { status: 'completed', label: '服务结束', description: '物资已交接，订单完成', completed: false, current: false },
    ],
    availableActions: ['start_stop_trip', 'supply_operation', 'device_test', 'route_plan', 'contact_service'],
  },
}

// ═══ 路线规划 ═══

export const MOCK_ROUTE_PLANS: Record<string, RoutePlan> = {
  rp_demo_vending: {
    id: 'rp_demo_vending',
    orderId: 'DEMO-005',
    points: [
      { id: 'p1', type: 'start', name: '中关村广场', lat: 39.9142, lng: 116.3974, duration: 0 },
      { id: 'p2', type: 'task_stop', name: '望京SOHO', lat: 39.9042, lng: 116.4074, duration: 30, tasks: ['vst_shelf', 'vst_voice'] },
      { id: 'p3', type: 'waypoint', name: '三元桥', lat: 39.9100, lng: 116.4600 },
      { id: 'p4', type: 'task_stop', name: '太阳宫', lat: 39.9680, lng: 116.4100, duration: 20, tasks: ['vst_shelf'] },
      { id: 'p5', type: 'end', name: '返回中关村广场', lat: 39.9142, lng: 116.3974, duration: 0 },
    ],
    segments: [
      { id: 'st1', fromWaypointId: 'p1', toWaypointId: 'p2', tasks: ['vsg_ad'] },
      { id: 'st2', fromWaypointId: 'p3', toWaypointId: 'p4', tasks: ['vsg_led'] },
    ],
    totalDistance: 18.5,
    drivingDuration: 40,
    totalDuration: 90,
  },
  rp_demo_security: {
    id: 'rp_demo_security',
    orderId: 'DEMO-007',
    points: [
      { id: 'p1', type: 'start', name: '建国门外大街', lat: 39.9092, lng: 116.4174, duration: 0 },
      { id: 'p2', type: 'task_stop', name: '东门入口', lat: 39.9080, lng: 116.4180, duration: 10, tasks: ['sst_photo', 'sst_device', 'sst_broadcast'] },
      { id: 'p3', type: 'task_stop', name: 'A栋大堂', lat: 39.9070, lng: 116.4190, duration: 8, tasks: ['sst_photo', 'sst_thermal'] },
      { id: 'p4', type: 'waypoint', name: 'B栋连廊', lat: 39.9060, lng: 116.4200 },
      { id: 'p5', type: 'task_stop', name: '地下车库入口', lat: 39.9050, lng: 116.4210, duration: 5, tasks: ['sst_device', 'sst_intercom'] },
      { id: 'p6', type: 'non_task_stop', name: '西门充电桩', lat: 39.9095, lng: 116.4160, duration: 15 },
      { id: 'p7', type: 'end', name: '返回建国门外', lat: 39.9092, lng: 116.4174, duration: 0 },
    ],
    segments: [
      { id: 'st1', fromWaypointId: 'p1', toWaypointId: 'p2', tasks: ['ssg_record'] },
      { id: 'st2', fromWaypointId: 'p4', toWaypointId: 'p5', tasks: ['ssg_record', 'ssg_detect'] },
    ],
    totalDistance: 5.8,
    drivingDuration: 25,
    totalDuration: 63,
  },
}

// ═══ 通知（仅活跃订单的通知） ═══

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n_demo_1', type: 'general', orderId: 'DEMO-001', serviceType: 'logistics', title: '运输中', message: '已离开望京SOHO，前往第1站中关村软件园二期，预计18分钟到达', read: false, dismissed: false, postponed: false, createdAt: NOW },
  { id: 'n_demo_2', type: 'special', orderId: 'DEMO-005', serviceType: 'vending', title: '库存提醒', message: '水果货架库存不足，请及时补货', read: false, dismissed: false, postponed: false, createdAt: NOW, actionLabel: '补货' },
  { id: 'n_demo_3', type: 'special', orderId: 'DEMO-007', serviceType: 'security', title: '异常告警', message: 'B2栋走廊检测到异常人员，请查看监控', read: false, dismissed: false, postponed: false, createdAt: NOW, actionLabel: '查看' },
]
