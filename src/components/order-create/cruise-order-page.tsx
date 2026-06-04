'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { useAppStore } from '@/store';
import type { SubPage } from '@/store';
import { useOrderStore } from '@/store/use-order-store';
import type { ServiceType } from '@/types';
import { SECURITY_RENTAL_PLANS } from '@/constants/services';
import type { RentalPlan } from '@/types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Upload,
  Download,
  Truck,
  ShoppingCart,
  Shield,
  Route,
  Clock,
  Package,
  FileSpreadsheet,
  Save,
  MapPin,
  TrendingUp,
  Copy,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';

/* ────────────────────────── 车型与套餐数据 ────────────────────────── */

interface VehicleModel {
  id: string;
  name: string;
  serviceType: 'vending' | 'security';
  specs: string;
  image: string;
  packages: PackageOption[];
  /** 安防车型推荐覆盖面积 (m²) */
  coverageArea?: number;
}

interface PackageOption {
  id: string;
  name: string;
  items: string[];
  price: string;
  priceNum: number;
  priceUnit: string;
}

const VEHICLE_MODELS: VehicleModel[] = [
  {
    id: 'vending-standard', name: '标准贩卖车', serviceType: 'vending',
    specs: '4层货架 · 续航120km', image: '/vehicle-vending.png',
    packages: [
      { id: 'pkg-v1', name: '基础货架套餐', items: ['4层标准货架×1', '商品标签屏×1'], price: '¥298/天', priceNum: 298, priceUnit: '/天' },
      { id: 'pkg-v2', name: '饮品专供套餐', items: ['4层冷藏货架×1', '温控系统×1'], price: '¥398/天', priceNum: 398, priceUnit: '/天' },
    ],
  },
  {
    id: 'vending-large', name: '大型贩卖车', serviceType: 'vending',
    specs: '6层货架 · 续航180km', image: '/vehicle-vending.png',
    packages: [
      { id: 'pkg-v3', name: '全品类货架套餐', items: ['6层标准货架×1', '商品标签屏×2'], price: '¥498/天', priceNum: 498, priceUnit: '/天' },
      { id: 'pkg-v4', name: '冷藏货架套餐', items: ['6层冷藏货架×1', '温控系统×2'], price: '¥598/天', priceNum: 598, priceUnit: '/天' },
    ],
  },
  {
    id: 'vending-beverage', name: '饮品专车', serviceType: 'vending',
    specs: '8层冷藏架 · 续航150km', image: '/vehicle-vending.png',
    packages: [
      { id: 'pkg-v5', name: '冷热双温套餐', items: ['4层冷藏+4层保温货架', '双温控系统'], price: '¥698/天', priceNum: 698, priceUnit: '/天' },
      { id: 'pkg-v6', name: '饮料专供套餐', items: ['8层冷藏货架', '自动出货系统'], price: '¥598/天', priceNum: 598, priceUnit: '/天' },
    ],
  },
  {
    id: 'security-basic', name: '基础巡检车', serviceType: 'security',
    specs: '5km/次 · 续航120km', image: '/vehicle-security.png', coverageArea: 15000,
    packages: [
      { id: 'pkg-s1', name: '基础监控套餐', items: ['1路高清摄像头', '警示灯', '语音播报'], price: '¥398/天', priceNum: 398, priceUnit: '/天' },
    ],
  },
  {
    id: 'security-standard', name: '标准巡检车', serviceType: 'security',
    specs: '10km/次 · 续航180km', image: '/vehicle-security.png', coverageArea: 30000,
    packages: [
      { id: 'pkg-s2', name: '标准监控套餐', items: ['2路高清摄像头', '红外夜视', '双向对讲', '警示灯'], price: '¥598/天', priceNum: 598, priceUnit: '/天' },
    ],
  },
  {
    id: 'security-advanced', name: '高级巡检车', serviceType: 'security',
    specs: '15km/次 · 续航200km', image: '/vehicle-security.png', coverageArea: 50000,
    packages: [
      { id: 'pkg-s3', name: '高级监控套餐', items: ['4路高清摄像头', '热成像', '双向对讲', '显示屏', '警示灯', '声光报警'], price: '¥898/天', priceNum: 898, priceUnit: '/天' },
    ],
  },
];

/* ────────────────────────── 批量订单类型 ────────────────────────── */

interface CruiseBatchItem {
  id: string;
  location: string;
  vehicleModelId: string;
  packageId: string;
  duration: string;
}

/* ────────────────────────── 预期参考数据 ────────────────────────── */

interface ExpectedData {
  dailySalesMin: number;
  dailySalesMax: number;
  dailyTraffic: string;
  roi: string;
}

const VENDING_EXPECTED: Record<string, ExpectedData> = {
  'vending-standard': { dailySalesMin: 800, dailySalesMax: 1200, dailyTraffic: '800+人/天', roi: '1:2.0' },
  'vending-large': { dailySalesMin: 1200, dailySalesMax: 1800, dailyTraffic: '1200+人/天', roi: '1:2.5' },
  'vending-beverage': { dailySalesMin: 1000, dailySalesMax: 1500, dailyTraffic: '1000+人/天', roi: '1:2.2' },
};

/* ────────────────────────── 主组件 ────────────────────────── */

export function CruiseOrderPage({ page }: { page: SubPage }) {
  const { pushPage } = useAppStore();
  const { setCostBreakdown } = useOrderStore();
  const [serviceType, setServiceType] = useState<'vending' | 'security'>('vending');
  const [batchMode, setBatchMode] = useState(false);
  const [hasRoutePlan, setHasRoutePlan] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const vehicleScrollRef = useRef<HTMLDivElement>(null);

  // 单条表单
  const [form, setForm] = useState({
    vehicleModelId: '',
    packageId: '',
    duration: '',
    location: '',
    contactName: '',
    contactPhone: '',
    remark: '',
    // 安防专用
    patrolArea: '',
    vehicleCount: 1,
    rentalPlanId: '',
  });

  // 批量公共信息
  const [batchCommon, setBatchCommon] = useState({
    contactName: '',
    contactPhone: '',
    rentalPlanId: '',
  });

  // 批量差异列表
  const [batchItems, setBatchItems] = useState<CruiseBatchItem[]>([
    { id: '1', location: '', vehicleModelId: '', packageId: '', duration: '' },
  ]);

  const updateForm = useCallback((field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const filteredModels = VEHICLE_MODELS.filter((v) => v.serviceType === serviceType);
  const selectedModel = VEHICLE_MODELS.find((v) => v.id === form.vehicleModelId);
  const selectedPackage = selectedModel?.packages.find((p) => p.id === form.packageId);
  const selectedRentalPlan = SECURITY_RENTAL_PLANS.find((rp) => rp.id === form.rentalPlanId);

  const handleServiceTypeChange = (type: 'vending' | 'security') => {
    setServiceType(type);
    updateForm('vehicleModelId', '');
    updateForm('packageId', '');
    updateForm('rentalPlanId', '');
    updateForm('vehicleCount', 1);
  };

  // 安防：智能推荐车辆数量
  const recommendedVehicleCount = useMemo(() => {
    if (serviceType !== 'security' || !form.patrolArea || !selectedModel?.coverageArea) return null;
    const area = parseFloat(form.patrolArea);
    if (isNaN(area) || area <= 0) return null;
    const count = Math.ceil(area / selectedModel.coverageArea);
    return Math.max(count, 1);
  }, [serviceType, form.patrolArea, selectedModel]);

  // ─── 费用预估 ──────────────────────────
  const estimateCost = useMemo(() => {
    if (serviceType === 'vending') {
      if (!selectedPackage) return null;
      const baseFee = selectedPackage.priceNum;
      const serviceFee = Math.round(baseFee * 0.1);
      const insuranceFee = 10;
      const total = baseFee + serviceFee + insuranceFee;
      return { baseFee, serviceFee, insuranceFee, discount: 0, total, label: '日' };
    } else {
      if (!selectedPackage || !selectedRentalPlan) return null;
      const perVehicleMonthly = selectedRentalPlan.pricePerDay * 30;
      const totalVehicleCost = perVehicleMonthly * form.vehicleCount;
      const cloudControlFee = 300 * form.vehicleCount;
      const insuranceFee = 600 * form.vehicleCount;
      const maintenanceFee = 200 * form.vehicleCount;
      const subtotal = totalVehicleCost + cloudControlFee + insuranceFee + maintenanceFee;
      const discount = selectedRentalPlan.discount ? Math.round(subtotal * (1 - parseFloat(selectedRentalPlan.discount) / 10)) : 0;
      const total = subtotal - discount;
      return {
        baseFee: totalVehicleCost,
        cloudControlFee,
        insuranceFee,
        maintenanceFee,
        discount,
        total,
        label: `${selectedRentalPlan.label}`,
      };
    }
  }, [serviceType, selectedPackage, selectedRentalPlan, form.vehicleCount]);

  // 批量费用预估
  const batchEstimateCost = useMemo(() => {
    if (!batchMode) return null;
    let totalBase = 0;
    let validCount = 0;
    for (const item of batchItems) {
      const model = VEHICLE_MODELS.find((v) => v.id === item.vehicleModelId);
      const pkg = model?.packages.find((p) => p.id === item.packageId);
      if (pkg) {
        totalBase += pkg.priceNum;
        validCount++;
      }
    }
    if (validCount === 0) return null;
    const serviceFee = Math.round(totalBase * 0.1);
    const insuranceFee = 10 * validCount;
    const total = totalBase + serviceFee + insuranceFee;
    return { totalBase, serviceFee, insuranceFee, total, count: validCount };
  }, [batchMode, batchItems]);

  const handleSubmit = () => {
    if (estimateCost) {
      setCostBreakdown({
        baseFee: estimateCost.baseFee,
        serviceFee: serviceType === 'vending' ? estimateCost.serviceFee : undefined,
        durationFee: serviceType === 'vending' ? estimateCost.baseFee : undefined,
        packageFee: serviceType === 'vending' ? estimateCost.baseFee : undefined,
        vehicleFee: serviceType === 'security' ? estimateCost.baseFee : undefined,
        cloudControlFee: estimateCost.cloudControlFee,
        insuranceFee: estimateCost.insuranceFee,
        discount: estimateCost.discount > 0 ? estimateCost.discount : undefined,
        discountLabel: estimateCost.discount > 0 && selectedRentalPlan
          ? `${selectedRentalPlan.label}优惠` : undefined,
        distanceFee: 0,
        total: batchMode ? (batchEstimateCost?.total ?? estimateCost.total) : estimateCost.total,
        totalAmount: batchMode ? (batchEstimateCost?.total ?? estimateCost.total) : estimateCost.total,
      });
    }
    pushPage({
      key: 'cost-confirm',
      data: {
        serviceType,
        vehicleModelId: form.vehicleModelId,
        packageId: form.packageId,
        hasRoutePlan,
        batchCount: batchMode ? batchItems.length : 1,
        vehicleCount: form.vehicleCount,
        rentalPlanId: form.rentalPlanId,
      },
    });
  };

  const handleSaveDraft = () => {
    alert('草稿已保存');
  };

  const handleSaveAsTemplate = () => {
    alert('已保存为模板，可在下次下单时快速引用');
  };

  const canSubmit = agreed && (batchMode ? (batchEstimateCost && batchEstimateCost.count > 0) : !!estimateCost);

  void page;

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
          <h1 className="text-[15px] font-medium text-[#1A1A1A]">巡游租车</h1>
          <button
            onClick={() => setBatchMode(!batchMode)}
            className={`text-[13px] px-2.5 py-1 rounded-lg transition-colors justify-self-end ${
              batchMode ? 'bg-[#1677FF] text-white' : 'bg-[#F5F6FA] text-[#666666]'
            }`}
          >
            {batchMode ? '退出批量' : '批量模式'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-40">
        {/* 贩卖/安防切换 */}
        <div className="px-4 pt-3">
          <div className="bg-white rounded-xl p-1 flex shadow-sm">
            <button
              onClick={() => handleServiceTypeChange('vending')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] transition-all ${
                serviceType === 'vending' ? 'bg-[#1677FF] text-white shadow-sm' : 'text-[#666666]'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              巡游贩卖
            </button>
            <button
              onClick={() => handleServiceTypeChange('security')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] transition-all ${
                serviceType === 'security' ? 'bg-[#1677FF] text-white shadow-sm' : 'text-[#666666]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              安防巡检
            </button>
          </div>
        </div>

        {/* ═══ 车型选择（统一横滑卡片） ═══ */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
            <div className="flex items-center gap-1.5 mb-2">
              <Truck className="w-3.5 h-3.5 text-[#1677FF]" />
              <span className="text-[13px] font-medium text-[#1A1A1A]">选择车型</span>
              {selectedModel && (
                <span className="text-[10px] text-[#52C41A] bg-[#F6FFED] px-1.5 py-0.5 rounded ml-auto">已选</span>
              )}
            </div>
            <div className="relative">
              {/* 左箭头 */}
              <button
                onClick={() => vehicleScrollRef.current?.scrollBy({ left: -160, behavior: 'smooth' })}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 w-7 h-7 rounded-full bg-white shadow-md border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F5F6FA] transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-[#666666]" />
              </button>
              {/* 车型卡片滚动区 */}
              <div ref={vehicleScrollRef} className="flex gap-2.5 overflow-x-auto hide-scrollbar px-5 scroll-smooth">
                {filteredModels.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      updateForm('vehicleModelId', v.id);
                      updateForm('packageId', '');
                    }}
                    className={`shrink-0 w-[140px] rounded-xl border-2 transition-all text-left ${
                      form.vehicleModelId === v.id
                        ? 'border-[#1677FF] bg-[#E6F0FF] shadow-sm'
                        : 'border-[#EEEEEE] bg-white hover:border-[#CCCCCC]'
                    }`}
                  >
                    <div className="p-2.5">
                      <img src={v.image} alt={v.name} className="w-full h-[72px] object-contain mb-2" />
                      <p className="text-[13px] font-medium text-[#1A1A1A] mb-0.5">{v.name}</p>
                      <p className="text-[11px] text-[#999999] mb-1">{v.specs}</p>
                      {v.coverageArea && (
                        <p className="text-[10px] text-[#1677FF]">覆盖 {v.coverageArea.toLocaleString()}m²</p>
                      )}
                      {v.packages[0] && (
                        <p className="text-[12px] text-[#FF4D4F] font-bold mt-1">{v.packages[0].price}起</p>
                      )}
                    </div>
                    {form.vehicleModelId === v.id && (
                      <div className="bg-[#1677FF] rounded-b-[10px] flex items-center justify-center py-1">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              {/* 右箭头 */}
              <button
                onClick={() => vehicleScrollRef.current?.scrollBy({ left: 160, behavior: 'smooth' })}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10 w-7 h-7 rounded-full bg-white shadow-md border border-[#EEEEEE] flex items-center justify-center hover:bg-[#F5F6FA] transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-[#666666]" />
              </button>
            </div>
          </div>
        </div>

        {/* ═══ 配套套餐（可视化卡片） ═══ */}
        {selectedModel && (
          <div className="px-4 mt-3">
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
              <div className="flex items-center gap-1.5 mb-2">
                <Package className="w-3.5 h-3.5 text-[#1677FF]" />
                <span className="text-[13px] font-medium text-[#1A1A1A]">配套套餐</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {selectedModel.packages.map((pkg) => {
                  const isSelected = form.packageId === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      onClick={() => updateForm('packageId', pkg.id)}
                      className={`p-2.5 rounded-xl border-2 text-left transition-all ${
                        isSelected
                          ? 'border-[#1677FF] bg-[#E6F0FF]'
                          : 'border-[#EEEEEE] bg-white hover:border-[#CCCCCC]'
                      }`}
                    >
                      <p className="text-[12px] font-medium text-[#1A1A1A] mb-1">{pkg.name}</p>
                      <div className={`inline-block px-1.5 py-0.5 rounded mb-1.5 ${isSelected ? 'bg-[#1677FF]/10' : 'bg-[#F5F6FA]'}`}>
                        <span className="text-[14px] text-[#FF4D4F] font-bold">{pkg.price}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pkg.items.slice(0, 2).map((item, i) => (
                          <span key={i} className="text-[9px] bg-[#F5F6FA] text-[#666666] px-1 py-0.5 rounded">
                            {item}
                          </span>
                        ))}
                        {pkg.items.length > 2 && (
                          <span className="text-[9px] text-[#1677FF]">+{pkg.items.length - 2}项</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedPackage && (
                <div className="mt-2 p-2 bg-[#F5F6FA] rounded-lg">
                  <p className="text-[11px] font-medium text-[#1A1A1A] mb-1">{selectedPackage.name} 包含：</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedPackage.items.map((item, i) => (
                      <span key={i} className="text-[10px] bg-white text-[#666666] px-1.5 py-0.5 rounded border border-[#EEEEEE]">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 贩卖：预期参考数据 */}
        {serviceType === 'vending' && selectedModel && VENDING_EXPECTED[selectedModel.id] && (
          <div className="px-4 mt-3">
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-[#52C41A]" />
                <span className="text-[13px] font-medium text-[#1A1A1A]">预期参考数据</span>
                <span className="text-[10px] text-[#999999]">（同区域均值）</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#F5F6FA] rounded-lg p-2 text-center">
                  <p className="text-[10px] text-[#999999]">日均客流</p>
                  <p className="text-[14px] font-bold text-[#1A1A1A]">{VENDING_EXPECTED[selectedModel.id].dailyTraffic}</p>
                </div>
                <div className="bg-[#F5F6FA] rounded-lg p-2 text-center">
                  <p className="text-[10px] text-[#999999]">日均销售额</p>
                  <p className="text-[14px] font-bold text-[#1A1A1A]">¥{VENDING_EXPECTED[selectedModel.id].dailySalesMin}-{VENDING_EXPECTED[selectedModel.id].dailySalesMax}</p>
                </div>
                <div className="bg-[#F5F6FA] rounded-lg p-2 text-center">
                  <p className="text-[10px] text-[#999999]">成本收益比</p>
                  <p className="text-[14px] font-bold text-[#52C41A]">{VENDING_EXPECTED[selectedModel.id].roi}</p>
                </div>
              </div>
              <p className="text-[10px] text-[#999999] mt-1.5">* 数据来源于同区域历史运营统计，仅供参考</p>
            </div>
          </div>
        )}

        {/* 安防：巡检配置 */}
        {serviceType === 'security' && (
          <div className="px-4 mt-3">
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
              <div className="flex items-center gap-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-[#1677FF]" />
                <span className="text-[13px] font-medium text-[#1A1A1A]">巡检配置</span>
              </div>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="巡检区域面积（m²，如 50000）"
                  value={form.patrolArea}
                  onChange={(e) => updateForm('patrolArea', e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                />
                <div>
                  <p className="text-[11px] text-[#999999] mb-1">车辆数量</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateForm('vehicleCount', Math.max(1, form.vehicleCount - 1))}
                      className="w-8 h-8 rounded-lg border border-[#EEEEEE] flex items-center justify-center text-[#666666] hover:bg-[#F5F6FA]"
                    >
                      -
                    </button>
                    <span className="text-[16px] font-bold text-[#1A1A1A] w-8 text-center">{form.vehicleCount}</span>
                    <button
                      onClick={() => updateForm('vehicleCount', form.vehicleCount + 1)}
                      className="w-8 h-8 rounded-lg border border-[#EEEEEE] flex items-center justify-center text-[#666666] hover:bg-[#F5F6FA]"
                    >
                      +
                    </button>
                    <span className="text-[11px] text-[#999999]">台</span>
                  </div>
                  {recommendedVehicleCount && recommendedVehicleCount !== form.vehicleCount && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="text-[10px] text-[#FAAD14]">建议 {recommendedVehicleCount} 台</span>
                      <button
                        onClick={() => updateForm('vehicleCount', recommendedVehicleCount)}
                        className="text-[10px] text-[#1677FF] hover:underline"
                      >
                        采纳建议
                      </button>
                      <span className="text-[10px] text-[#999999]">（区域分割更均匀，覆盖更完善）</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 安防：租赁周期套餐 */}
        {serviceType === 'security' && selectedPackage && (
          <div className="px-4 mt-3">
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-[#1677FF]" />
                <span className="text-[13px] font-medium text-[#1A1A1A]">租赁周期</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SECURITY_RENTAL_PLANS.map((plan) => {
                  const isSelected = form.rentalPlanId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => updateForm('rentalPlanId', plan.id)}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                        isSelected
                          ? 'border-[#1677FF] bg-[#E6F0FF]'
                          : 'border-[#EEEEEE] bg-white hover:border-[#CCCCCC]'
                      }`}
                    >
                      <p className="text-[13px] font-medium text-[#1A1A1A]">{plan.label}</p>
                      <div className={`inline-block px-1.5 py-0.5 rounded mt-1 ${isSelected ? 'bg-[#1677FF]/10' : 'bg-[#F5F6FA]'}`}>
                        <p className="text-[12px] text-[#FF4D4F] font-bold">¥{plan.pricePerDay}/天</p>
                      </div>
                      {plan.discount && (
                        <span className="text-[10px] text-[#52C41A] bg-[#F6FFED] px-1 py-0.5 rounded inline-block mt-1">{plan.discount}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedRentalPlan && (
                <div className="mt-2 p-2 bg-[#F5F6FA] rounded-lg flex items-center justify-between">
                  <span className="text-[11px] text-[#666666]">
                    {form.vehicleCount}台 × {selectedRentalPlan.label} = ¥{selectedRentalPlan.totalPrice * form.vehicleCount}
                  </span>
                  {selectedRentalPlan.discount && (
                    <span className="text-[11px] text-[#52C41A]">已享{selectedRentalPlan.discount}</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 路线规划入口 */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Route className="w-3.5 h-3.5 text-[#1677FF]" />
                <span className="text-[13px] font-medium text-[#1A1A1A]">路线规划</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setHasRoutePlan(false);
                    pushPage({ key: 'route-plan', data: { serviceType } });
                  }}
                  className="text-[12px] text-[#1677FF] hover:underline"
                >
                  {hasRoutePlan ? '查看/修改' : '去规划'}
                </button>
                {!hasRoutePlan && (
                  <span className="text-[11px] text-[#999999]">可稍后规划</span>
                )}
              </div>
            </div>
            {hasRoutePlan && (
              <div className="mt-2 p-2 bg-[#F5F6FA] rounded-lg">
                <p className="text-[11px] text-[#666666]">已规划路线：3个停留点 · 预计2.5小时</p>
              </div>
            )}
          </div>
        </div>

        {/* ═══════════ 单条模式：服务信息 + 费用 ═══════════ */}
        {!batchMode && (
          <div className="px-4 mt-3 space-y-3">
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-[#1677FF]" />
                <span className="text-[13px] font-medium text-[#1A1A1A]">服务信息</span>
              </div>
              <div className="space-y-2">
                {serviceType === 'vending' && (
                  <input
                    type="text"
                    placeholder="服务时长（如：4小时、1天）"
                    value={form.duration}
                    onChange={(e) => updateForm('duration', e.target.value)}
                    className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                  />
                )}
                <input
                  type="text"
                  placeholder="服务区域/地点"
                  value={form.location}
                  onChange={(e) => updateForm('location', e.target.value)}
                  className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="联系人"
                    value={form.contactName}
                    onChange={(e) => updateForm('contactName', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                  />
                  <input
                    type="tel"
                    placeholder="手机号"
                    value={form.contactPhone}
                    onChange={(e) => updateForm('contactPhone', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                  />
                </div>
              </div>
            </div>

            {/* 费用预估 */}
            {estimateCost && (
              <div className="bg-[#E6F0FF] rounded-xl p-3 shadow-sm overflow-hidden border border-[#BAE0FF]">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[13px]">💰</span>
                  <span className="text-[13px] font-medium text-[#1A1A1A]">费用预估</span>
                  {estimateCost.label && (
                    <span className="text-[10px] text-[#999999]">（{estimateCost.label}）</span>
                  )}
                </div>
                <div className="space-y-2">
                  {serviceType === 'vending' ? (
                    <>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#666666]">套餐费用</span>
                        <span className="text-[#1A1A1A]">¥{estimateCost.baseFee}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#666666]">平台服务费（10%）</span>
                        <span className="text-[#1A1A1A]">¥{estimateCost.serviceFee}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#666666]">保险费</span>
                        <span className="text-[#1A1A1A]">¥{estimateCost.insuranceFee}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#666666]">车辆租赁费</span>
                        <span className="text-[#1A1A1A]">¥{estimateCost.baseFee.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#666666]">云控管理</span>
                        <span className="text-[#1A1A1A]">¥{estimateCost.cloudControlFee!.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#666666]">保险费</span>
                        <span className="text-[#1A1A1A]">¥{estimateCost.insuranceFee!.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[12px]">
                        <span className="text-[#666666]">维修保养</span>
                        <span className="text-[#1A1A1A]">¥{estimateCost.maintenanceFee!.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  {estimateCost.discount > 0 && (
                    <div className="flex justify-between text-[12px]">
                      <span className="text-[#666666]">优惠</span>
                      <span className="text-[#52C41A]">-¥{estimateCost.discount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-[#BAE0FF] pt-2 flex justify-between">
                    <span className="text-[13px] font-medium text-[#1A1A1A]">预估合计</span>
                    <span className="text-[15px] font-bold text-[#FF4D4F]">¥{estimateCost.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

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

        {/* ═══════════ 批量模式：公共信息 + 差异列表 ═══════════ */}
        {batchMode && (
          <div className="px-4 mt-3 space-y-3">
            {/* 公共信息 */}
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden border-l-[3px] border-l-[#1677FF]">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[11px] text-white bg-[#1677FF] rounded px-1.5 py-0.5 font-medium">公共</span>
                <span className="text-[13px] font-medium text-[#1A1A1A]">所有订单共享</span>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="联系人"
                    value={batchCommon.contactName}
                    onChange={(e) => setBatchCommon(prev => ({ ...prev, contactName: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                  />
                  <input
                    type="tel"
                    placeholder="手机号"
                    value={batchCommon.contactPhone}
                    onChange={(e) => setBatchCommon(prev => ({ ...prev, contactPhone: e.target.value }))}
                    className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0"
                  />
                </div>
                {serviceType === 'security' && (
                  <div className="grid grid-cols-3 gap-2">
                    {SECURITY_RENTAL_PLANS.map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => setBatchCommon(prev => ({ ...prev, rentalPlanId: plan.id }))}
                        className={`p-2 rounded-lg border-2 text-center transition-all text-[11px] ${
                          batchCommon.rentalPlanId === plan.id
                            ? 'border-[#1677FF] bg-[#E6F0FF]'
                            : 'border-[#EEEEEE] bg-white'
                        }`}
                      >
                        <span className="font-medium">{plan.label}</span>
                        <br />
                        <span className="text-[#FF4D4F]">¥{plan.pricePerDay}/天</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Excel导入 */}
            <div className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
              <div className="flex items-center gap-1.5 mb-2">
                <FileSpreadsheet className="w-3.5 h-3.5 text-[#1677FF]" />
                <span className="text-[13px] font-medium text-[#1A1A1A]">批量导入</span>
              </div>
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-dashed border-[#1677FF] text-[12px] text-[#1677FF] hover:bg-[#E6F0FF] transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  上传Excel/CSV
                  <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      const lines = text.split('\n').filter(l => l.trim());
                      if (lines.length < 2) return;
                      const newItems: CruiseBatchItem[] = [];
                      for (let i = 1; i < lines.length; i++) {
                        const cols = lines[i].split(',').map(c => c.trim());
                        if (cols[0]) {
                          newItems.push({
                            id: String(Date.now()) + String(i),
                            location: cols[0] || '',
                            vehicleModelId: cols[1] || '',
                            packageId: cols[2] || '',
                            duration: cols[3] || '',
                          });
                        }
                      }
                      if (newItems.length > 0) {
                        setBatchItems(prev => [...prev, ...newItems]);
                      }
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }} />
                </label>
                <button
                  onClick={() => {
                    const headers = serviceType === 'vending'
                      ? '服务区域,车型ID,套餐ID,服务时长'
                      : '巡检区域,车型ID,套餐ID,服务时长';
                    const blob = new Blob([headers + '\n'], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `巡游租车批量模板.csv`;
                    link.click();
                    URL.revokeObjectURL(link.href);
                  }}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[#EEEEEE] text-[12px] text-[#666666] hover:bg-[#F5F6FA] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  下载模板
                </button>
              </div>
            </div>

            {/* 差异列表 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-[#1A1A1A]">
                    {serviceType === 'vending' ? '车辆及区域' : '车辆及区域'}
                  </span>
                  <span className="text-[11px] text-[#999999]">（{batchItems.length}条）</span>
                </div>
                <button
                  onClick={() => setBatchItems(prev => [...prev, { id: String(Date.now()), location: '', vehicleModelId: '', packageId: '', duration: '' }])}
                  className="flex items-center gap-0.5 text-[12px] text-[#1677FF] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加
                </button>
              </div>

              {batchItems.map((item, idx) => {
                const itemModel = VEHICLE_MODELS.find(v => v.id === item.vehicleModelId);
                return (
                  <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] font-medium text-[#1A1A1A]">第 {idx + 1} 条</span>
                      <button
                        onClick={() => {
                          if (batchItems.length > 1) {
                            setBatchItems(prev => prev.filter(o => o.id !== item.id));
                          }
                        }}
                        className="text-[11px] text-[#FF4D4F] hover:underline flex items-center gap-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        删除
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder={serviceType === 'vending' ? '服务区域/地点' : '巡检区域'}
                        value={item.location}
                        onChange={(e) => setBatchItems(prev => prev.map(o => o.id === item.id ? { ...o, location: e.target.value } : o))}
                        className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                      />
                      {/* 车型快捷选择 */}
                      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                        {filteredModels.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setBatchItems(prev => prev.map(o => o.id === item.id ? { ...o, vehicleModelId: v.id, packageId: '' } : o))}
                            className={`shrink-0 px-2 py-1 rounded-lg border text-[11px] transition-all ${
                              item.vehicleModelId === v.id
                                ? 'border-[#1677FF] bg-[#E6F0FF] text-[#1677FF]'
                                : 'border-[#EEEEEE] text-[#666666]'
                            }`}
                          >
                            {v.name}
                          </button>
                        ))}
                      </div>
                      {/* 套餐快捷选择 */}
                      {itemModel && (
                        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                          {itemModel.packages.map((pkg) => (
                            <button
                              key={pkg.id}
                              onClick={() => setBatchItems(prev => prev.map(o => o.id === item.id ? { ...o, packageId: pkg.id } : o))}
                              className={`shrink-0 px-2 py-1 rounded-lg border text-[11px] transition-all ${
                                item.packageId === pkg.id
                                  ? 'border-[#1677FF] bg-[#E6F0FF] text-[#1677FF]'
                                  : 'border-[#EEEEEE] text-[#666666]'
                              }`}
                            >
                              {pkg.name} {pkg.price}
                            </button>
                          ))}
                        </div>
                      )}
                      <input
                        type="text"
                        placeholder="服务时长"
                        value={item.duration}
                        onChange={(e) => setBatchItems(prev => prev.map(o => o.id === item.id ? { ...o, duration: e.target.value } : o))}
                        className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 批量费用预估 */}
            {batchEstimateCost && (
              <div className="bg-[#E6F0FF] rounded-xl p-3 shadow-sm overflow-hidden border border-[#BAE0FF]">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[13px]">💰</span>
                  <span className="text-[13px] font-medium text-[#1A1A1A]">批量费用预估</span>
                  <span className="text-[10px] text-[#999999]">（{batchEstimateCost.count}单）</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#666666]">套餐费用合计</span>
                    <span className="text-[#1A1A1A]">¥{batchEstimateCost.totalBase.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#666666]">平台服务费（10%）</span>
                    <span className="text-[#1A1A1A]">¥{batchEstimateCost.serviceFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#666666]">保险费</span>
                    <span className="text-[#1A1A1A]">¥{batchEstimateCost.insuranceFee.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-[#BAE0FF] pt-2 flex justify-between">
                    <span className="text-[13px] font-medium text-[#1A1A1A]">合计</span>
                    <span className="text-[15px] font-bold text-[#FF4D4F]">¥{batchEstimateCost.total.toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-[#999999]">
                    均 ¥{Math.round(batchEstimateCost.total / batchEstimateCost.count).toLocaleString()}/单
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══ 底部操作栏 ═══ */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#EEEEEE]">
        {/* 费用摘要条 */}
        {!batchMode && estimateCost && (
          <div className="px-4 pt-2 flex items-center justify-between">
            <span className="text-[12px] text-[#666666]">预估合计</span>
            <span className="text-[16px] font-bold text-[#FF4D4F]">¥{estimateCost.total.toLocaleString()}</span>
          </div>
        )}
        {batchMode && batchEstimateCost && (
          <div className="px-4 pt-2 flex items-center justify-between">
            <span className="text-[12px] text-[#666666]">{batchEstimateCost.count}单合计</span>
            <span className="text-[16px] font-bold text-[#FF4D4F]">¥{batchEstimateCost.total.toLocaleString()}</span>
          </div>
        )}
        {/* 服务协议 */}
        <div className="flex items-center gap-1.5 px-4 mt-1">
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
            我已阅读并同意<span className="text-[#1677FF]">《无人车巡游服务协议》</span>
          </span>
        </div>
        {!agreed && (
          <p className="text-[10px] text-[#FAAD14] px-4 mt-0.5">请先勾选服务协议</p>
        )}
        {/* 操作按钮 */}
        <div className="flex gap-2 px-4 py-3">
          {serviceType === 'security' ? (
            <button
              onClick={handleSaveAsTemplate}
              className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-[#EEEEEE] text-[12px] text-[#666666] hover:bg-[#F5F6FA] transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              保存模板
            </button>
          ) : (
            <button
              onClick={handleSaveDraft}
              className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border border-[#EEEEEE] text-[12px] text-[#666666] hover:bg-[#F5F6FA] transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              保存草稿
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 py-2.5 bg-[#1677FF] text-white rounded-xl text-[14px] font-medium hover:bg-[#4096FF] active:bg-[#0958D9] transition-colors disabled:bg-[#CCCCCC] disabled:cursor-not-allowed"
          >
            确认下单
          </button>
        </div>
      </div>
    </div>
  );
}
