'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAppStore, useOrderStore } from '@/store';
import type { Order, ServiceType, OrderStatus } from '@/types';
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  CheckCircle2,
  Circle,
  Truck,
  BatteryMedium,
  Route,
  ArrowLeft,
  BarChart3,
  Package,
  ShoppingCart,
  Shield,
  TrendingUp,
  AlertTriangle,
  Eye,
  Clock,
  MapPin,
  Video,
  Camera,
  Zap,
  ThermometerSun,
  Droplets,
} from 'lucide-react';

/* ────────────────────────── 工具函数 ────────────────────────── */

function getStatusLabel(status: OrderStatus): string {
  const map: Record<OrderStatus, string> = {
    pending: '待调度',
    dispatched: '已调度',
    pricing: '计算费用',
    paying: '待支付',
    dispatching: '调度中',
    loading: '装货中',
    picked_up: '已取货',
    in_transit: '配送中',
    arrived: '已到达',
    unloading: '卸货中',
    picking_up: '取件中',
    completed: '已完成',
    cancelled: '已取消',
    started: '进行中',
    vending_active: '贩卖中',
    vending_paused: '贩卖暂停',
    selling: '贩卖中',
    paused: '贩卖暂停',
    patrolling: '巡检中',
  };
  return map[status] ?? '未知';
}

function getOrderTypeLabel(order: Order): string {
  if (order.serviceType === 'logistics') {
    return order.deliveryMode === 'full_load' ? '整车配送' : '零担配送';
  }
  if (order.serviceType === 'vending') return '巡游贩卖';
  if (order.serviceType === 'security') return '安防巡检';
  return '未知类型';
}

/* ────────────────────────── 进度时间线 ────────────────────────── */

interface TimelineStep {
  status: OrderStatus;
  label: string;
  time?: string;
  completed: boolean;
  current: boolean;
}

function getOrderTimeline(order: Order): TimelineStep[] {
  if (order.serviceType === 'logistics') {
    return [
      { status: 'pending', label: '已下单', completed: true, current: false, time: '09:00' },
      { status: 'dispatched', label: '已调度', completed: true, current: false, time: '09:05' },
      { status: 'loading', label: '已装货', completed: true, current: false, time: '09:15' },
      { status: 'in_transit', label: '运输中', completed: order.status !== 'in_transit', current: order.status === 'in_transit' },
      { status: 'arrived', label: '已到达', completed: ['arrived', 'unloading', 'picking_up', 'completed'].includes(order.status), current: order.status === 'arrived' },
      { status: 'completed', label: '已签收', completed: order.status === 'completed', current: false },
    ];
  }
  if (order.serviceType === 'vending') {
    return [
      { status: 'dispatched', label: '已调度', completed: true, current: false, time: '08:30' },
      { status: 'started', label: '已出发', completed: true, current: false, time: '09:00' },
      { status: 'vending_active', label: '贩卖中', completed: ['vending_paused', 'completed'].includes(order.status), current: ['vending_active', 'vending_paused'].includes(order.status) },
      { status: 'completed', label: '已结束', completed: order.status === 'completed', current: false },
    ];
  }
  // security
  return [
    { status: 'dispatched', label: '已调度', completed: true, current: false, time: '10:00' },
    { status: 'started', label: '已出发', completed: true, current: false, time: '10:10' },
    { status: 'patrolling', label: '巡检中', completed: false, current: order.status === 'patrolling' },
    { status: 'completed', label: '已结束', completed: order.status === 'completed', current: false },
  ];
}

/* ────────────────────────── 可视化组件 ────────────────────────── */

/** 环形进度图（纯CSS） */
function RingProgress({ value, size = 56, stroke = 5, color = '#1677FF', label, unit }: {
  value: number; size?: number; stroke?: number; color?: string; label: string; unit?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E8ECF0" strokeWidth={stroke} />
          <circle
            cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[14px] font-medium text-[#1A1A1A]">{value}</span>
          {unit && <span className="text-[8px] text-[#999999] ml-0.5">{unit}</span>}
        </div>
      </div>
      <span className="text-[10px] text-[#999999] mt-1">{label}</span>
    </div>
  );
}

/** 横向条形图 */
function BarItem({ label, value, max, color = '#1677FF', showValue }: {
  label: string; value: number; max: number; color?: string; showValue?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="mb-1.5 last:mb-0">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-[#666666]">{label}</span>
        <span className="text-[10px] text-[#999999]">{showValue ?? value}</span>
      </div>
      <div className="h-2 bg-[#E8ECF0] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/** 设备状态灯 */
function DeviceStatusLight({ name, online }: { name: string; online: boolean }) {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-[#52C41A] shadow-[0_0_4px_rgba(82,196,26,0.5)]' : 'bg-[#FF4D4F] shadow-[0_0_4px_rgba(255,77,79,0.5)]'}`} />
      <span className="text-[11px] text-[#1A1A1A]">{name}</span>
      <span className={`text-[9px] ${online ? 'text-[#52C41A]' : 'text-[#FF4D4F]'}`}>{online ? '在线' : '离线'}</span>
    </div>
  );
}

/* ────────────────────────── 数据看板子组件 ────────────────────────── */

function DataCard({ label, value, unit, icon: Icon, color = '#1677FF' }: {
  label: string; value: string | number; unit?: string; icon: typeof Truck; color?: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 bg-[#F5F6FA] rounded-lg">
      <div className="w-7 h-7 flex items-center justify-center rounded-md shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-[#999999]">{label}</p>
        <p className="text-[14px] font-medium text-[#1A1A1A] leading-tight">
          {value}{unit && <span className="text-[10px] text-[#999999] ml-0.5">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

/** 物流配送数据看板 */
function LogisticsDashboard({ order }: { order: Order }) {
  const progress = order.status === 'completed' ? 100 : order.status === 'arrived' || order.status === 'unloading' ? 85 : order.status === 'in_transit' ? 60 : 30;

  return (
    <div className="space-y-3">
      {/* 顶部：环形进度+关键指标 */}
      <div className="flex items-center gap-3">
        <RingProgress value={progress} label="配送进度" unit="%" color="#1677FF" />
        <div className="flex-1 space-y-1.5">
          <DataCard label="剩余距离" value="3.2" unit="km" icon={MapPin} color="#1677FF" />
          <DataCard label="预计到达" value="15" unit="分钟" icon={Truck} color="#52C41A" />
        </div>
      </div>
      {/* 车辆电量条 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#999999] flex items-center gap-1">
            <BatteryMedium className="w-3 h-3" />车辆电量
          </span>
          <span className="text-[10px] text-[#52C41A] font-medium">{order.vehicleBattery ?? 78}%</span>
        </div>
        <div className="h-2 bg-[#E8ECF0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${order.vehicleBattery ?? 78}%`,
              backgroundColor: (order.vehicleBattery ?? 78) > 30 ? '#52C41A' : '#FF4D4F',
            }}
          />
        </div>
      </div>
    </div>
  );
}

/** 巡游贩卖数据看板 */
function VendingDashboard({ order }: { order: Order }) {
  const mode = order.status === 'vending_active' || order.status === 'selling' ? '即停即走' : order.status === 'vending_paused' ? '定点驻停' : '待出发';

  return (
    <div className="space-y-3">
      {/* 顶部：运营模式+关键指标 */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center justify-center bg-[#E6F0FF] rounded-lg w-14 h-14 shrink-0">
          <Eye className="w-4 h-4 text-[#1677FF] mb-0.5" />
          <span className="text-[9px] text-[#1677FF] font-medium text-center leading-tight">{mode}</span>
        </div>
        <div className="flex-1 space-y-1.5">
          <DataCard label="今日销售" value="¥1,280" icon={TrendingUp} color="#52C41A" />
          <DataCard label="车辆电量" value={order.vehicleBattery ?? 85} unit="%" icon={BatteryMedium} color="#52C41A" />
        </div>
      </div>
      {/* 库存状况 */}
      <div className="p-2 bg-[#F5F6FA] rounded-lg">
        <p className="text-[10px] text-[#999999] mb-1.5">库存状况</p>
        <BarItem label="饮料" value={35} max={50} color="#1677FF" showValue="35/50" />
        <BarItem label="零食" value={20} max={40} color="#52C41A" showValue="20/40" />
        <BarItem label="水果" value={8} max={20} color="#FAAD14" showValue="8/20" />
      </div>
      {/* 热销商品排行 */}
      <div className="p-2 bg-[#F5F6FA] rounded-lg">
        <p className="text-[10px] text-[#999999] mb-1.5">热销商品 TOP4</p>
        {[
          { name: '可口可乐', sold: 18, unit: '瓶' },
          { name: '农夫山泉', sold: 15, unit: '瓶' },
          { name: '薯片', sold: 12, unit: '袋' },
          { name: '苹果', sold: 8, unit: '个' },
        ].map((item, idx) => (
          <div key={item.name} className="flex items-center gap-1.5 mb-1 last:mb-0">
            <span className={`w-4 h-4 flex items-center justify-center rounded text-[8px] font-medium ${
              idx === 0 ? 'bg-[#FF4D4F] text-white' : idx === 1 ? 'bg-[#FAAD14] text-white' : 'bg-[#E8ECF0] text-[#999999]'
            }`}>
              {idx + 1}
            </span>
            <span className="text-[10px] text-[#666666] flex-1 truncate">{item.name}</span>
            <span className="text-[10px] text-[#1A1A1A] font-medium">{item.sold}{item.unit}</span>
          </div>
        ))}
      </div>
      {/* 销售趋势（简易柱形图） */}
      <div className="p-2 bg-[#F5F6FA] rounded-lg">
        <p className="text-[10px] text-[#999999] mb-1.5">今日销售趋势</p>
        <div className="flex items-end gap-1 h-[50px]">
          {[
            { hour: '09', amount: 120 },
            { hour: '10', amount: 280 },
            { hour: '11', amount: 350 },
            { hour: '12', amount: 410 },
            { hour: '13', amount: 280 },
            { hour: '14', amount: 120 },
          ].map((item) => {
            const maxAmount = 410;
            const heightPct = (item.amount / maxAmount) * 100;
            return (
              <div key={item.hour} className="flex-1 flex flex-col items-center gap-0.5">
                <div
                  className="w-full bg-[#1677FF] rounded-t transition-all duration-700 min-h-[2px]"
                  style={{ height: `${heightPct}%` }}
                />
                <span className="text-[7px] text-[#999999]">{item.hour}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 安防巡检数据看板 */
function SecurityDashboard({ order }: { order: Order }) {
  const devices = [
    { name: '高清摄像头', online: true },
    { name: '红外夜视', online: true },
    { name: '双向对讲', online: true },
    { name: '警示灯', online: true },
    { name: '显示屏', online: false },
  ];

  return (
    <div className="space-y-3">
      {/* 顶部：环形进度+关键指标 */}
      <div className="flex items-center gap-3">
        <RingProgress value={60} label="巡检进度" unit="%" color="#1677FF" />
        <div className="flex-1 space-y-1.5">
          <DataCard label="异常事件" value="1" unit="件" icon={AlertTriangle} color="#FF4D4F" />
          <DataCard label="巡检时长" value="1.5" unit="h" icon={Clock} color="#1677FF" />
        </div>
      </div>
      {/* 设备状态 */}
      <div className="p-2 bg-[#F5F6FA] rounded-lg">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-[#999999]">设备状态</span>
          <span className="text-[10px] text-[#52C41A]">{devices.filter((d) => d.online).length}/{devices.length} 在线</span>
        </div>
        <div className="grid grid-cols-2 gap-x-2">
          {devices.map((d) => (
            <DeviceStatusLight key={d.name} name={d.name} online={d.online} />
          ))}
        </div>
      </div>
      {/* 车辆电量 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#999999] flex items-center gap-1">
            <BatteryMedium className="w-3 h-3" />车辆电量
          </span>
          <span className="text-[10px] font-medium" style={{ color: (order.vehicleBattery ?? 92) > 30 ? '#52C41A' : '#FF4D4F' }}>
            {order.vehicleBattery ?? 92}%
          </span>
        </div>
        <div className="h-2 bg-[#E8ECF0] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${order.vehicleBattery ?? 92}%`,
              backgroundColor: (order.vehicleBattery ?? 92) > 30 ? '#52C41A' : '#FF4D4F',
            }}
          />
        </div>
      </div>
      {/* 异常事件列表 */}
      <div className="p-2 bg-[#FFF2F0] rounded-lg border border-[#FFCCC7]">
        <div className="flex items-center gap-1 mb-1">
          <AlertTriangle className="w-3 h-3 text-[#FF4D4F]" />
          <span className="text-[10px] text-[#FF4D4F] font-medium">异常事件</span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D4F] mt-1 shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] text-[#1A1A1A]">B2栋走廊检测到异常人员</p>
            <p className="text-[9px] text-[#999999]">14:10 · 未处理</p>
          </div>
          <button className="text-[9px] text-[#1677FF] hover:underline shrink-0">查看</button>
        </div>
      </div>
      {/* 实时巡检视频 */}
      <div className="p-2 bg-[#F5F6FA] rounded-lg">
        <p className="text-[10px] text-[#999999] mb-1.5">实时巡检画面</p>
        <div className="relative w-full aspect-video bg-[#1A1A1A] rounded-md overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
          <div className="relative z-10 flex flex-col items-center gap-1">
            <Video className="w-8 h-8 text-white/60" />
            <span className="text-[10px] text-white/50">实时巡检视频</span>
            <span className="text-[9px] text-white/30">(MVP模拟 · 后续接入真实视频流)</span>
          </div>
          {/* 模拟视频扫描线 */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px bg-green-400/30 animate-pulse" />
          </div>
          {/* 模拟视频时间戳 */}
          <div className="absolute bottom-1 right-1.5 text-[8px] text-red-400 font-mono animate-pulse">
            ● REC
          </div>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────── 主组件 ────────────────────────── */

export function TrackingPage() {
  const { orders, activeOrderId } = useOrderStore();
  const { setActiveTab, pushPage } = useAppStore();
  const [progressExpanded, setProgressExpanded] = useState(false);
  const [orderDropdownOpen, setOrderDropdownOpen] = useState(false);

  // 获取在途订单列表
  const activeOrders = useMemo(
    () => orders.filter((o) => !['completed', 'cancelled'].includes(o.status)),
    [orders],
  );

  const [selectedOrderIdx, setSelectedOrderIdx] = useState(0);

  // 当 activeOrderId 变化时（如从首页"查看更多"跳转），切换到对应订单
  useEffect(() => {
    if (activeOrderId) {
      const idx = activeOrders.findIndex((o) => o.id === activeOrderId);
      if (idx >= 0) {
        setSelectedOrderIdx(idx);
      }
    }
  }, [activeOrderId, activeOrders]);

  const currentOrder = activeOrders[selectedOrderIdx] ?? null;

  // 如果没有在途订单
  if (activeOrders.length === 0) {
    return (
      <div className="flex flex-col h-full bg-[#F5F6FA]">
        <div className="bg-white px-4 py-3 border-b border-[#EEEEEE]">
          <h1 className="text-[16px] font-medium text-[#1A1A1A] text-center">服务跟踪</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Crosshair className="w-10 h-10 mx-auto text-[#DDDDDD] mb-2" />
            <p className="text-[13px] text-[#999999]">暂无在途订单</p>
            <p className="text-[11px] text-[#CCCCCC] mt-1">下单后可以在这里实时跟踪</p>
          </div>
        </div>
      </div>
    );
  }

  const timeline = currentOrder ? getOrderTimeline(currentOrder) : [];

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      {/* 顶部导航：订单切换 */}
      <div className="bg-white border-b border-[#EEEEEE] relative">
        <div className="flex items-center justify-between px-4 py-2.5">
          <button
            onClick={() => setOrderDropdownOpen(!orderDropdownOpen)}
            className="flex items-center gap-1 text-[14px] text-[#1A1A1A] font-medium"
          >
            {currentOrder ? `${getOrderTypeLabel(currentOrder)} · ${currentOrder.vehiclePlate}` : '选择订单'}
            <ChevronDown size="14" className={`text-[#999999] transition-transform ${orderDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {/* 返回首页操作 */}
          <button
            onClick={() => {
              if (currentOrder) {
                useAppStore.getState().setDynamicsTab(currentOrder.serviceType);
              }
              setActiveTab('home');
            }}
            className="flex items-center gap-0.5 text-[12px] text-[#1677FF] hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            返回首页操作
          </button>
        </div>

        {/* 订单下拉选择 */}
        {orderDropdownOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOrderDropdownOpen(false)} />
            <div className="absolute top-full left-0 right-0 bg-white border-b border-[#EEEEEE] shadow-lg z-50 max-h-[200px] overflow-y-auto hide-scrollbar">
              {activeOrders.map((order, idx) => (
                <button
                  key={order.id}
                  onClick={() => {
                    setSelectedOrderIdx(idx);
                    setOrderDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] hover:bg-[#F5F6FA] transition-colors ${
                    idx === selectedOrderIdx ? 'bg-[#E6F0FF]' : ''
                  }`}
                >
                  <span className="text-[#1A1A1A]">
                    {order.vehicleModel} · {getStatusLabel(order.status)}
                  </span>
                  <span className="text-[11px] text-[#999999]">{order.id.slice(-8)}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* 内容区：可滚动 */}
      <div className="flex-1 overflow-y-auto hide-scrollbar">
        {/* 进度栏（默认折叠，位于数据看板上方） */}
        {currentOrder && (
          <div className="px-4 pt-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setProgressExpanded(!progressExpanded)}
                className="w-full flex items-center justify-between px-4 py-2.5"
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${timeline.find((s) => s.current) ? 'bg-[#1677FF] animate-pulse' : 'bg-[#52C41A]'}`} />
                  <span className="text-[13px] text-[#1A1A1A]">
                    {getStatusLabel(currentOrder.status)}
                    {currentOrder.estimatedTime ? ` · 预计${currentOrder.estimatedTime}分钟到达` : ''}
                  </span>
                </div>
                {progressExpanded ? (
                  <ChevronUp className="w-4 h-4 text-[#999999]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#999999]" />
                )}
              </button>

              {progressExpanded && (
                <div className="px-4 pb-3 border-t border-[#EEEEEE]">
                  <div className="mt-2 space-y-0">
                    {timeline.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="flex flex-col items-center w-4 shrink-0">
                          {step.completed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#52C41A]" />
                          ) : step.current ? (
                            <Circle className="w-3.5 h-3.5 text-[#1677FF] fill-[#1677FF]/20" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-[#DDDDDD]" />
                          )}
                          {idx < timeline.length - 1 && (
                            <div className={`w-0.5 h-4 ${step.completed ? 'bg-[#52C41A]' : 'bg-[#DDDDDD]'}`} />
                          )}
                        </div>
                        <div className="flex items-center justify-between flex-1 pb-1">
                          <span className={`text-[12px] ${step.completed || step.current ? 'text-[#1A1A1A]' : 'text-[#999999]'}`}>
                            {step.label}
                          </span>
                          {step.time && <span className="text-[10px] text-[#999999]">{step.time}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 数据看板（进度栏下方） */}
        <div className="px-4 py-2">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-2">
              <BarChart3 className="w-3.5 h-3.5 text-[#1677FF]" />
              <span className="text-[12px] font-medium text-[#1A1A1A]">数据看板</span>
            </div>
            {currentOrder?.serviceType === 'logistics' && currentOrder && <LogisticsDashboard order={currentOrder} />}
            {currentOrder?.serviceType === 'vending' && currentOrder && <VendingDashboard order={currentOrder} />}
            {currentOrder?.serviceType === 'security' && currentOrder && <SecurityDashboard order={currentOrder} />}
          </div>
        </div>

        {/* 地图区域 */}
        <div className="px-4 pb-2">
          <div className="bg-[#E8ECF0] rounded-xl h-[180px] flex items-center justify-center relative overflow-hidden">
            <div className="text-center">
              <MapPin className="w-8 h-8 mx-auto text-[#999999] mb-1" />
              <p className="text-[12px] text-[#999999]">区域地图（MVP模拟）</p>
              <p className="text-[10px] text-[#CCCCCC]">后续升级高德地图</p>
            </div>
            {/* 路线规划悬浮按钮（仅巡游/安防） */}
            {currentOrder && currentOrder.serviceType !== 'logistics' && (
              <button
                onClick={() => {
                  if (currentOrder) {
                    pushPage({ key: 'route-plan', data: { orderId: currentOrder.id, serviceType: currentOrder.serviceType } });
                  }
                }}
                className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/90 rounded-full shadow hover:bg-white transition-colors"
              >
                <Route className="w-4 h-4 text-[#1677FF]" />
              </button>
            )}
            {/* 模拟车辆位置 */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1 bg-white/90 rounded-full px-2 py-1 shadow-sm">
                <Truck className="w-3 h-3 text-[#1677FF]" />
                <span className="text-[10px] text-[#1A1A1A]">{currentOrder?.vehicleModel ?? '车辆'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
