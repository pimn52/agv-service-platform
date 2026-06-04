'use client';

import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/store';
import type { SubPage } from '@/store';
import { useOrderStore } from '@/store/use-order-store';
import type { CargoType, SpecialRequirement } from '@/types';
import { CARGO_TYPES, SPECIAL_REQUIREMENTS } from '@/constants/services';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Download,
  Truck,
  Package,
  Weight,
  Clock,
  Box,
  MapPin,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Inbox,
} from 'lucide-react';

/* ────────────────────────── 车型数据 ────────────────────────── */

interface VehicleModel {
  id: string;
  name: string;
  loadCapacity: string;
  volume: string;
  range: string;
  maxSpeed: string;
  image: string;
}

const VEHICLE_MODELS: VehicleModel[] = [
  { id: 'Z2', name: 'Z2 小型配送车', loadCapacity: '300kg', volume: '2m³', range: '110km', maxSpeed: '30km/h', image: '/vehicle-delivery.jfif' },
  { id: 'Z5', name: 'Z5 中型配送车', loadCapacity: '800kg', volume: '5m³', range: '180km', maxSpeed: '40km/h', image: '/vehicle-delivery.jfif' },
  { id: 'X3', name: 'X3 紧凑配送车', loadCapacity: '500kg', volume: '3m³', range: '100km', maxSpeed: '60km/h', image: '/vehicle-delivery.jfif' },
  { id: 'X6', name: 'X6 标准配送车', loadCapacity: '800kg', volume: '6m³', range: '200km', maxSpeed: '60km/h', image: '/vehicle-delivery.jfif' },
  { id: 'P3', name: 'P3 模块配送车', loadCapacity: '800kg', volume: '3m³', range: '150km', maxSpeed: '40km/h', image: '/vehicle-delivery.jfif' },
];

/* ────────────────────────── 类型 ────────────────────────── */

type DeliveryMode = 'full' | 'lcl';

interface BatchReceiverItem {
  id: string;
  receiverAddress: string;
  receiverName: string;
  receiverPhone: string;
  cargoName: string;
  cargoWeight: string;
  deliveryTime: string;
}

/* ────────────────────────── 主组件 ────────────────────────── */

export function DeliveryOrderPage({ page }: { page: SubPage }) {
  const { pushPage } = useAppStore();
  const { setCostBreakdown } = useOrderStore();
  const [mode, setMode] = useState<DeliveryMode>('full');
  const [batchMode, setBatchMode] = useState(false);
  const [agreed, setAgreed] = useState(false);

  // 单条订单表单
  const [form, setForm] = useState({
    senderAddress: '',
    receiverAddress: '',
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    cargoName: '',
    cargoType: '' as CargoType | '',
    specialRequirements: [] as SpecialRequirement[],
    cargoWeight: '',
    cargoDimensions: '',
    deliveryTime: '',
    vehicleModelId: '',
    remark: '',
  });

  // 批量模式：公共信息（发货方共享）
  const [batchCommon, setBatchCommon] = useState({
    senderAddress: '',
    senderName: '',
    senderPhone: '',
    vehicleModelId: '',
    cargoType: '' as CargoType | '',
    specialRequirements: [] as SpecialRequirement[],
  });

  // 批量模式：收货列表（每条差异信息）
  const [batchReceivers, setBatchReceivers] = useState<BatchReceiverItem[]>([
    { id: '1', receiverAddress: '', receiverName: '', receiverPhone: '', cargoName: '', cargoWeight: '', deliveryTime: '' },
  ]);

  // CSV 导入状态
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateForm = useCallback((field: string, value: string | SpecialRequirement[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const toggleSpecialReq = useCallback((req: SpecialRequirement) => {
    setForm((prev) => ({
      ...prev,
      specialRequirements: prev.specialRequirements.includes(req)
        ? prev.specialRequirements.filter((r) => r !== req)
        : [...prev.specialRequirements, req],
    }));
  }, []);

  const toggleBatchSpecialReq = useCallback((req: SpecialRequirement) => {
    setBatchCommon((prev) => ({
      ...prev,
      specialRequirements: prev.specialRequirements.includes(req)
        ? prev.specialRequirements.filter((r) => r !== req)
        : [...prev.specialRequirements, req],
    }));
  }, []);

  const updateBatchReceiver = useCallback((id: string, field: keyof BatchReceiverItem, value: string) => {
    setBatchReceivers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)),
    );
  }, []);

  const addBatchReceiver = useCallback(() => {
    setBatchReceivers((prev) => [
      ...prev,
      { id: String(Date.now()), receiverAddress: '', receiverName: '', receiverPhone: '', cargoName: '', cargoWeight: '', deliveryTime: '' },
    ]);
  }, []);

  const removeBatchReceiver = useCallback((id: string) => {
    setBatchReceivers((prev) => (prev.length <= 1 ? prev : prev.filter((o) => o.id !== id)));
  }, []);

  const selectedVehicle = VEHICLE_MODELS.find((v) => v.id === form.vehicleModelId);
  const batchSelectedVehicle = VEHICLE_MODELS.find((v) => v.id === batchCommon.vehicleModelId);
  const vehicleScrollRef = useRef<HTMLDivElement>(null);
  const batchVehicleScrollRef = useRef<HTMLDivElement>(null);

  const scrollVehicleList = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      ref.current.scrollBy({
        left: direction === 'left' ? -130 : 130,
        behavior: 'smooth',
      });
    }
  };

  // ─── CSV 导入 ──────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').filter((l) => l.trim());
      if (lines.length < 2) return;
      const header = lines[0].split(',').map((h) => h.trim());
      const rows = lines.slice(1).map((line) => line.split(',').map((c) => c.trim()));
      setCsvPreviewData([header, ...rows]);
      setShowCsvPreview(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const confirmCsvImport = useCallback(() => {
    if (csvPreviewData.length < 2) return;
    const header = csvPreviewData[0];
    const newReceivers: BatchReceiverItem[] = csvPreviewData.slice(1).map((row, i) => ({
      id: `csv-${i}`,
      receiverAddress: row[header.indexOf('收货地址')] || row[0] || '',
      receiverName: row[header.indexOf('收货人')] || row[1] || '',
      receiverPhone: row[header.indexOf('收货电话')] || row[2] || '',
      cargoName: row[header.indexOf('货物名称')] || row[3] || '',
      cargoWeight: row[header.indexOf('重量kg')] || row[4] || '',
      deliveryTime: row[header.indexOf('配送时间')] || row[5] || '',
    }));
    setBatchReceivers(newReceivers);
    setShowCsvPreview(false);
    setCsvPreviewData([]);
  }, [csvPreviewData]);

  const downloadTemplate = useCallback(() => {
    const csv = '收货地址,收货人,收货电话,货物名称,重量kg,配送时间\n杭州市西湖区××路,张三,13800000000,日用品补货,120,今天14:00-16:00';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '配送批量导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ─── 切换批量模式：自动带入公共信息 ──────────────────────────
  const toggleBatchMode = useCallback(() => {
    if (!batchMode) {
      // 进入批量：把单条的发货信息带入公共区域
      setBatchCommon({
        senderAddress: form.senderAddress,
        senderName: form.senderName,
        senderPhone: form.senderPhone,
        vehicleModelId: form.vehicleModelId,
        cargoType: form.cargoType,
        specialRequirements: form.specialRequirements,
      });
      // 把单条的收货信息带入第一条
      if (form.receiverAddress || form.receiverName) {
        setBatchReceivers([{
          id: '1',
          receiverAddress: form.receiverAddress,
          receiverName: form.receiverName,
          receiverPhone: form.receiverPhone,
          cargoName: form.cargoName,
          cargoWeight: form.cargoWeight,
          deliveryTime: form.deliveryTime,
        }]);
      }
    }
    setBatchMode(!batchMode);
  }, [batchMode, form]);

  // ─── 费用预估 ──────────────────────────
  const estimateCost = (vehicleId: string, specials: SpecialRequirement[], orderCount: number) => {
    if (mode === 'full' && !vehicleId) return null;
    const baseFee = mode === 'full' ? 35 : 8;
    const distanceFee = mode === 'full' ? 52.5 : 25;
    const weightFee = mode === 'lcl' ? 15 : 0;
    const insuranceFee = 2;
    const hasColdChain = specials.includes('cold_chain');
    const surcharge = hasColdChain ? 18 : 0;
    const discount = orderCount > 1 ? -3 * orderCount : -5;
    const total = (baseFee + distanceFee + weightFee + surcharge + insuranceFee + discount) * orderCount;
    const perOrder = total / orderCount;
    return { baseFee, distanceFee, weightFee, surcharge, insuranceFee, discount, total, perOrder, orderCount };
  };

  const costEst = batchMode
    ? estimateCost(batchCommon.vehicleModelId, batchCommon.specialRequirements, batchReceivers.length)
    : estimateCost(form.vehicleModelId, form.specialRequirements, 1);

  const handleSubmit = () => {
    if (costEst) {
      setCostBreakdown({
        baseFee: costEst.baseFee,
        mileageFee: costEst.distanceFee,
        distanceFee: costEst.distanceFee,
        weightFee: costEst.weightFee > 0 ? costEst.weightFee : undefined,
        insuranceFee: costEst.insuranceFee,
        discount: costEst.discount < 0 ? Math.abs(costEst.discount) : undefined,
        discountLabel: costEst.discount < 0 ? (batchMode ? '批量优惠' : '平台补贴') : undefined,
        total: costEst.total,
        totalAmount: costEst.total,
      });
    }
    pushPage({
      key: 'cost-confirm',
      data: {
        serviceType: 'logistics',
        mode,
        vehicleModelId: mode === 'full' ? (batchMode ? batchCommon.vehicleModelId : form.vehicleModelId) : undefined,
        batchCount: batchMode ? batchReceivers.length : 1,
        cargoType: batchMode ? batchCommon.cargoType : form.cargoType,
        specialRequirements: batchMode ? batchCommon.specialRequirements : form.specialRequirements,
      },
    });
  };

  const handleSaveDraft = () => {
    alert('草稿已保存');
  };

  void page;

  // ─── 车型卡片组件（复用） ──────────────────────────
  const renderVehicleSelector = (
    vehicleId: string,
    onSelect: (id: string) => void,
    scrollRef: React.RefObject<HTMLDivElement | null>,
  ) => (
    <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
      <div className="flex items-center gap-1.5 mb-2">
        <Truck className="w-3.5 h-3.5 text-[#1677FF]" />
        <span className="text-[13px] font-medium text-[#1A1A1A]">选择车型</span>
      </div>
      <div className="relative">
        <button
          onClick={() => scrollVehicleList(scrollRef, 'left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 w-6 h-6 bg-white/90 rounded-full shadow-md flex items-center justify-center text-[#666666] hover:text-[#1677FF] hover:bg-white transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <div ref={scrollRef} className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 px-5">
          {VEHICLE_MODELS.map((v) => (
            <button
              key={v.id}
              onClick={() => onSelect(v.id)}
              className={`shrink-0 w-[120px] p-2 rounded-lg border-2 text-left transition-all ${
                vehicleId === v.id
                  ? 'border-[#1677FF] bg-[#E6F0FF]'
                  : 'border-[#EEEEEE] bg-white hover:border-[#CCCCCC]'
              }`}
            >
              <img src={v.image} alt={v.name} className="w-full h-[50px] object-contain mb-1" />
              <p className="text-[11px] font-medium text-[#1A1A1A] truncate">{v.name}</p>
              <div className="mt-1 space-y-0.5">
                <p className="text-[9px] text-[#999999] flex items-center gap-0.5">
                  <Weight className="w-2.5 h-2.5" /> {v.loadCapacity}
                </p>
                <p className="text-[9px] text-[#999999] flex items-center gap-0.5">
                  <Box className="w-2.5 h-2.5" /> {v.volume}
                </p>
                <p className="text-[9px] text-[#999999] flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" /> 续航{v.range}
                </p>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={() => scrollVehicleList(scrollRef, 'right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10 w-6 h-6 bg-white/90 rounded-full shadow-md flex items-center justify-center text-[#666666] hover:text-[#1677FF] hover:bg-white transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
      {(vehicleId ? VEHICLE_MODELS.find((v) => v.id === vehicleId) : null) && (
        <div className="mt-2 p-2 bg-[#F5F6FA] rounded-lg flex items-center gap-2">
          <img src={VEHICLE_MODELS.find((v) => v.id === vehicleId)!.image} alt="" className="w-12 h-12 object-contain" />
          <div>
            <p className="text-[12px] font-medium text-[#1A1A1A]">{VEHICLE_MODELS.find((v) => v.id === vehicleId)!.name}</p>
            <p className="text-[10px] text-[#999999]">
              载重{VEHICLE_MODELS.find((v) => v.id === vehicleId)!.loadCapacity} · 容积{VEHICLE_MODELS.find((v) => v.id === vehicleId)!.volume} · 续航{VEHICLE_MODELS.find((v) => v.id === vehicleId)!.range}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  // ─── 费用明细组件（复用） ──────────────────────────
  const renderCostBreakdown = (cost: NonNullable<ReturnType<typeof estimateCost>>) => (
    <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden border-l-[3px] border-[#1677FF]">
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[13px]">💰</span>
        <span className="text-[13px] font-medium text-[#1A1A1A]">费用预估</span>
        {cost.orderCount > 1 && (
          <span className="text-[11px] text-[#1677FF] bg-[#E6F0FF] px-1.5 py-0.5 rounded">{cost.orderCount}单</span>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[12px]">
          <span className="text-[#666666]">基础运费</span>
          <span className="text-[#1A1A1A]">¥{cost.baseFee.toFixed(1)}{cost.orderCount > 1 ? ` × ${cost.orderCount}` : ''}</span>
        </div>
        <div className="flex justify-between text-[12px]">
          <span className="text-[#666666]">里程费</span>
          <span className="text-[#1A1A1A]">¥{cost.distanceFee.toFixed(1)}{cost.orderCount > 1 ? ` × ${cost.orderCount}` : ''}</span>
        </div>
        {cost.weightFee > 0 && (
          <div className="flex justify-between text-[12px]">
            <span className="text-[#666666]">重量附加费</span>
            <span className="text-[#1A1A1A]">¥{cost.weightFee.toFixed(1)}{cost.orderCount > 1 ? ` × ${cost.orderCount}` : ''}</span>
          </div>
        )}
        {cost.surcharge > 0 && (
          <div className="flex justify-between text-[12px]">
            <span className="text-[#666666]">冷链附加费</span>
            <span className="text-[#1A1A1A]">¥{cost.surcharge.toFixed(1)}{cost.orderCount > 1 ? ` × ${cost.orderCount}` : ''}</span>
          </div>
        )}
        <div className="flex justify-between text-[12px]">
          <span className="text-[#666666]">保险费</span>
          <span className="text-[#1A1A1A]">¥{cost.insuranceFee.toFixed(1)}{cost.orderCount > 1 ? ` × ${cost.orderCount}` : ''}</span>
        </div>
        {cost.discount < 0 && (
          <div className="flex justify-between text-[12px]">
            <span className="text-[#666666]">{cost.orderCount > 1 ? '批量优惠' : '平台补贴'}</span>
            <span className="text-[#52C41A]">¥{cost.discount.toFixed(1)}</span>
          </div>
        )}
        <div className="border-t border-[#EEEEEE] pt-2 flex justify-between items-end">
          <div>
            <span className="text-[13px] font-medium text-[#1A1A1A]">预估合计</span>
            {cost.orderCount > 1 && (
              <span className="text-[11px] text-[#999999] ml-1.5">均 ¥{cost.perOrder.toFixed(1)}/单</span>
            )}
          </div>
          <span className="text-[18px] font-bold text-[#FF4D4F]">¥{cost.total.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      {/* 顶部信息栏 */}
      <div className="bg-white border-b border-[#EEEEEE]">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5">
          <button
            onClick={() => useAppStore.getState().popPage()}
            className="flex items-center gap-1 text-[#1677FF] active:opacity-60 transition-opacity justify-self-start"
          >
            <ArrowLeft size={18} />
            <span className="text-[13px]">返回</span>
          </button>
          <h1 className="text-[15px] font-medium text-[#1A1A1A]">配送下单</h1>
          <button
            onClick={toggleBatchMode}
            className={`text-[13px] px-2.5 py-1 rounded-lg transition-colors justify-self-end ${
              batchMode ? 'bg-[#1677FF] text-white' : 'bg-[#F5F6FA] text-[#666666]'
            }`}
          >
            {batchMode ? '退出批量' : '批量模式'}
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-28">
        {/* 整车/零担切换 */}
        <div className="px-4 pt-3">
          <div className="bg-white rounded-xl p-1 flex shadow-sm">
            <button
              onClick={() => setMode('full')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] transition-all ${
                mode === 'full' ? 'bg-[#1677FF] text-white shadow-sm' : 'text-[#666666]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              整车配送
            </button>
            <button
              onClick={() => setMode('lcl')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] transition-all ${
                mode === 'lcl' ? 'bg-[#1677FF] text-white shadow-sm' : 'text-[#666666]'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              零担配送
            </button>
          </div>
        </div>

        {batchMode ? (
          /* ═══════════ 批量模式 ═══════════ */
          <div className="px-4 mt-3 space-y-3">
            {/* 公共信息（发货方 - 所有订单共享） */}
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden border-l-[3px] border-[#52C41A]">
              <div className="flex items-center gap-1.5 mb-2">
                <Send className="w-3.5 h-3.5 text-[#52C41A]" />
                <span className="text-[13px] font-medium text-[#1A1A1A]">公共信息</span>
                <span className="text-[10px] text-[#999999]">（所有订单共享）</span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="发货地址"
                  value={batchCommon.senderAddress}
                  onChange={(e) => setBatchCommon((p) => ({ ...p, senderAddress: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="发货人姓名"
                    value={batchCommon.senderName}
                    onChange={(e) => setBatchCommon((p) => ({ ...p, senderName: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                  />
                  <input
                    type="tel"
                    placeholder="手机号"
                    value={batchCommon.senderPhone}
                    onChange={(e) => setBatchCommon((p) => ({ ...p, senderPhone: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                  />
                </div>
                {/* 货物类型 */}
                <select
                  value={batchCommon.cargoType}
                  onChange={(e) => setBatchCommon((p) => ({ ...p, cargoType: e.target.value as CargoType | '' }))}
                  className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] text-[#1A1A1A] appearance-none"
                >
                  <option value="" disabled>选择货物类型</option>
                  {CARGO_TYPES.map((ct) => (
                    <option key={ct.key} value={ct.key}>{ct.label}</option>
                  ))}
                </select>
                {/* 特殊要求 */}
                <div>
                  <p className="text-[11px] text-[#999999] mb-1.5">特殊要求</p>
                  <div className="flex flex-wrap gap-2">
                    {SPECIAL_REQUIREMENTS.map((req) => {
                      const checked = batchCommon.specialRequirements.includes(req.key);
                      return (
                        <button
                          key={req.key}
                          onClick={() => toggleBatchSpecialReq(req.key)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                            checked
                              ? 'border-[#1677FF] bg-[#E6F0FF] text-[#1677FF]'
                              : 'border-[#EEEEEE] bg-white text-[#666666] hover:border-[#CCCCCC]'
                          }`}
                        >
                          <span className="text-[12px]">{req.icon}</span>
                          {req.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* 整车：车型选择（公共） */}
            {mode === 'full' && (
              <div>
                {renderVehicleSelector(batchCommon.vehicleModelId, (id) => setBatchCommon((p) => ({ ...p, vehicleModelId: id })), batchVehicleScrollRef)}
              </div>
            )}

            {/* 收货列表（差异信息） */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Inbox className="w-3.5 h-3.5 text-[#1677FF]" />
                  <span className="text-[13px] font-medium text-[#1A1A1A]">收货列表</span>
                  <span className="text-[11px] text-[#999999]">（{batchReceivers.length}条）</span>
                </div>
              </div>

              {/* 批量导入 */}
              <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden mb-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#1677FF]" />
                  <span className="text-[12px] font-medium text-[#1A1A1A]">批量导入</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-[#1677FF] text-[12px] text-[#1677FF] hover:bg-[#E6F0FF] transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    上传CSV
                  </button>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[#EEEEEE] text-[12px] text-[#666666] hover:bg-[#F5F6FA] transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    下载模板
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
              </div>

              {/* CSV预览弹窗 */}
              {showCsvPreview && csvPreviewData.length > 1 && (
                <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden mb-2 border border-[#1677FF]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-medium text-[#1677FF]">识别到 {csvPreviewData.length - 1} 条收货记录</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setShowCsvPreview(false); setCsvPreviewData([]); }} className="text-[11px] text-[#999999]">取消</button>
                      <button onClick={confirmCsvImport} className="text-[11px] text-[#1677FF] font-medium">确认导入</button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="bg-[#F5F6FA]">
                          {csvPreviewData[0].map((h, i) => (
                            <th key={i} className="px-2 py-1 text-left text-[#999999] font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreviewData.slice(1, 4).map((row, ri) => (
                          <tr key={ri} className="border-b border-[#F5F6FA]">
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-2 py-1 text-[#1A1A1A]">{cell}</td>
                            ))}
                          </tr>
                        ))}
                        {csvPreviewData.length > 4 && (
                          <tr><td colSpan={csvPreviewData[0].length} className="px-2 py-1 text-[#999999] text-center">...共 {csvPreviewData.length - 1} 条</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 收货条目列表 */}
              <div className="space-y-2">
                {batchReceivers.map((item, idx) => (
                  <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#1677FF] text-white text-[10px] flex items-center justify-center font-medium">{idx + 1}</span>
                        <span className="text-[12px] font-medium text-[#1A1A1A]">收货信息</span>
                      </div>
                      {batchReceivers.length > 1 && (
                        <button onClick={() => removeBatchReceiver(item.id)} className="text-[#FF4D4F] hover:underline text-[11px] flex items-center gap-0.5">
                          <Trash2 className="w-3 h-3" />
                          删除
                        </button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="收货地址"
                        value={item.receiverAddress}
                        onChange={(e) => updateBatchReceiver(item.id, 'receiverAddress', e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="收货人"
                          value={item.receiverName}
                          onChange={(e) => updateBatchReceiver(item.id, 'receiverName', e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                        />
                        <input
                          type="tel"
                          placeholder="电话"
                          value={item.receiverPhone}
                          onChange={(e) => updateBatchReceiver(item.id, 'receiverPhone', e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="货物名称"
                          value={item.cargoName}
                          onChange={(e) => updateBatchReceiver(item.id, 'cargoName', e.target.value)}
                          className="flex-1 px-3 py-1.5 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                        />
                        <input
                          type="text"
                          placeholder="重量kg"
                          value={item.cargoWeight}
                          onChange={(e) => updateBatchReceiver(item.id, 'cargoWeight', e.target.value)}
                          className="w-20 px-3 py-1.5 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 添加收货条目 */}
              <button
                onClick={addBatchReceiver}
                className="w-full mt-2 py-2.5 rounded-xl border border-dashed border-[#1677FF] text-[12px] text-[#1677FF] flex items-center justify-center gap-1 hover:bg-[#E6F0FF] transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                添加收货信息
              </button>
            </div>

            {/* 批量费用预估 */}
            {costEst && renderCostBreakdown(costEst)}
          </div>
        ) : (
          /* ═══════════ 单条订单表单 ═══════════ */
          <div className="px-4 mt-3 space-y-3">
            {/* 整车：车型选择 */}
            {mode === 'full' && (
              <div>
                {renderVehicleSelector(form.vehicleModelId, (id) => updateForm('vehicleModelId', id), vehicleScrollRef)}
              </div>
            )}

            {/* 零担提示 */}
            {mode === 'lcl' && (
              <div className="bg-[#E6F0FF] rounded-xl p-3 flex items-start gap-2">
                <Package className="w-4 h-4 text-[#1677FF] shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] font-medium text-[#1677FF]">零担拼车配送</p>
                  <p className="text-[11px] text-[#666666] mt-0.5">多批次货物拼车配送，按重量/体积计费，无需选车型</p>
                </div>
              </div>
            )}

            {/* 发货人信息 */}
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
              <div className="flex items-center gap-1.5 mb-2">
                <Send className="w-3.5 h-3.5 text-[#1677FF]" />
                <span className="text-[13px] font-medium text-[#1A1A1A]">发货人信息</span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="发货地址"
                  value={form.senderAddress}
                  onChange={(e) => updateForm('senderAddress', e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="姓名"
                    value={form.senderName}
                    onChange={(e) => updateForm('senderName', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                  />
                  <input
                    type="tel"
                    placeholder="手机号"
                    value={form.senderPhone}
                    onChange={(e) => updateForm('senderPhone', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                  />
                </div>
              </div>
            </div>

            {/* 收货人信息 */}
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
              <div className="flex items-center gap-1.5 mb-2">
                <Inbox className="w-3.5 h-3.5 text-[#52C41A]" />
                <span className="text-[13px] font-medium text-[#1A1A1A]">收货人信息</span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="收货地址"
                  value={form.receiverAddress}
                  onChange={(e) => updateForm('receiverAddress', e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="姓名"
                    value={form.receiverName}
                    onChange={(e) => updateForm('receiverName', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                  />
                  <input
                    type="tel"
                    placeholder="手机号"
                    value={form.receiverPhone}
                    onChange={(e) => updateForm('receiverPhone', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                  />
                </div>
              </div>
            </div>

            {/* 货物信息 */}
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
              <div className="flex items-center gap-1.5 mb-2">
                <Package className="w-3.5 h-3.5 text-[#FAAD14]" />
                <span className="text-[13px] font-medium text-[#1A1A1A]">货物信息</span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="货物名称"
                  value={form.cargoName}
                  onChange={(e) => updateForm('cargoName', e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                />
                <select
                  value={form.cargoType}
                  onChange={(e) => updateForm('cargoType', e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] text-[#1A1A1A] appearance-none"
                >
                  <option value="" disabled>选择货物类型</option>
                  {CARGO_TYPES.map((ct) => (
                    <option key={ct.key} value={ct.key}>{ct.label}</option>
                  ))}
                </select>
                {mode === 'lcl' && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="重量(kg)"
                      value={form.cargoWeight}
                      onChange={(e) => updateForm('cargoWeight', e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                    />
                    <input
                      type="text"
                      placeholder="尺寸(长x宽x高)"
                      value={form.cargoDimensions}
                      onChange={(e) => updateForm('cargoDimensions', e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                    />
                  </div>
                )}
                {/* 特殊要求 */}
                <div>
                  <p className="text-[11px] text-[#999999] mb-1.5">特殊要求</p>
                  <div className="flex flex-wrap gap-2">
                    {SPECIAL_REQUIREMENTS.map((req) => {
                      const checked = form.specialRequirements.includes(req.key);
                      return (
                        <button
                          key={req.key}
                          onClick={() => toggleSpecialReq(req.key)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${
                            checked
                              ? 'border-[#1677FF] bg-[#E6F0FF] text-[#1677FF]'
                              : 'border-[#EEEEEE] bg-white text-[#666666] hover:border-[#CCCCCC]'
                          }`}
                        >
                          <span className="text-[12px]">{req.icon}</span>
                          {req.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="配送时间（选填）"
                  value={form.deliveryTime}
                  onChange={(e) => updateForm('deliveryTime', e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                />
              </div>
            </div>

            {/* 费用预估 */}
            {costEst && renderCostBreakdown(costEst)}

            {/* 备注 */}
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
              <textarea
                placeholder="备注信息（选填）"
                value={form.remark}
                onChange={(e) => updateForm('remark', e.target.value)}
                className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] resize-none h-16"
              />
            </div>
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#EEEEEE] px-4 py-3">
        {/* 费用摘要 */}
        {costEst && (
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#F5F6FA]">
            <span className="text-[12px] text-[#666666]">
              {batchMode ? `${batchReceivers.length}单合计` : '预估合计'}
            </span>
            <span className="text-[18px] font-bold text-[#FF4D4F]">¥{costEst.total.toFixed(1)}</span>
          </div>
        )}
        {/* 服务协议 */}
        <div className="flex items-center gap-1.5 mb-2">
          <button
            onClick={() => setAgreed(!agreed)}
            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
              agreed ? 'bg-[#1677FF] border-[#1677FF]' : 'bg-white border-[#CCCCCC]'
            }`}
          >
            {agreed && (
              <svg viewBox="0 0 12 12" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 6l3 3 5-5" />
              </svg>
            )}
          </button>
          <span className="text-[11px] text-[#999999]">
            我已阅读并同意<span className="text-[#1677FF]">《无人车配送服务协议》</span>
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveDraft}
            className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl border border-[#EEEEEE] text-[13px] text-[#666666] hover:bg-[#F5F6FA] transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            保存草稿
          </button>
          <button
            onClick={handleSubmit}
            disabled={!agreed}
            className="flex-1 py-2.5 bg-[#1677FF] text-white rounded-xl text-[14px] font-medium hover:bg-[#4096FF] active:bg-[#0958D9] transition-colors disabled:bg-[#CCCCCC] disabled:cursor-not-allowed"
          >
            确认下单
          </button>
        </div>
        {!agreed && (
          <p className="text-[10px] text-[#FAAD14] mt-1 text-center">请先勾选服务协议</p>
        )}
      </div>
    </div>
  );
}
