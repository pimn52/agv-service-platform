'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '@/store';
import type { SubPage } from '@/store';
import { useOrderStore } from '@/store/use-order-store';
import { SECURITY_RENTAL_PLANS } from '@/constants/services';
import { AddressBookButton } from '@/components/shared/address-book-button';
import { TimeSlotPicker } from '@/components/shared/time-slot-picker';
import { PeriodSection } from '@/components/shared/period-section';
import { computePeriodInfo, getPaymentLabel, getDisplayTotal } from '@/components/shared/period-utils';
import type { PeriodFreq, PeriodDuration, PaymentMode } from '@/components/shared/period-utils';
import { SectionHeader } from '@/components/shared/section-header';
import { VehicleShowcaseCarousel } from './vehicle-showcase-carousel';
import { getShortName } from './vehicle-data-helpers';
import type { ShowcaseVehicleData } from './vehicle-data-helpers';
import type { VehicleShowcaseCarouselHandle } from './vehicle-showcase-carousel';
import type { PackageOption } from './cruise-vehicle-configurator';
import { CruiseVehicleConfigurator } from './cruise-vehicle-configurator';
import type { AddressEntry } from '@/data/addresses';
import { CRUISE_ADDRESS_BOOK } from '@/data/addresses';
import { toast } from '@/components/ui/toast';
import {
  ArrowLeft, Plus, Trash2, Upload, Download,
  Truck, ShoppingCart, Shield, Route, Clock, MapPin,
  TrendingUp, ChevronRight,
} from 'lucide-react';

/* ────────────────────────── 车型（每车型绑定唯一套餐，车型决定套餐） ────────────────────────── */
interface LocalVehicleModel { id: string; name: string; serviceType: 'vending' | 'security'; specs: string; image: string; boundPackage: PackageOption; coverageArea?: number; }
const VEHICLE_MODELS: LocalVehicleModel[] = [
  { id: 'vm_std', name: '标准贩卖车', serviceType: 'vending', specs: '4层标准货架 · 续航200km · AI 254TOPS', image: '/vehicle-vending.png', boundPackage:
    { id: 'vp_basic', name: '基础货架套餐', items: ['4层标准货架×1', '商品标签屏×1'], price: 298, compatibleModels: ['vm_std'] },
  },
  { id: 'vm_smart', name: '智能零售专车', serviceType: 'vending', specs: 'LED互动屏 · 透明货柜 · AI 254TOPS', image: '/vehicle-vending.png', boundPackage:
    { id: 'vp_smart', name: '互动零售套餐', items: ['LED互动屏×1', '透明展示货柜×1', '商品标签屏×1'], price: 498, compatibleModels: ['vm_smart'] },
  },
  { id: 'vm_drink', name: '饮品专车', serviceType: 'vending', specs: '4独立冷藏货厢 · -18℃冷冻 · AI 254TOPS', image: '/vehicle-vending.png', boundPackage:
    { id: 'vp_drink', name: '饮品专供套餐', items: ['4层冷藏货架×1', '温控系统×1'], price: 398, compatibleModels: ['vm_drink'] },
  },
  { id: 'sm_basic', name: '基础巡检车', serviceType: 'security', specs: '5km/次 · 续航200km · 双Orin-X', image: '/vehicle-security.png', coverageArea: 5000, boundPackage:
    { id: 'sp_basic', name: '基础巡检套餐', items: ['高清摄像头×1', '报警器', '广播系统'], price: 398, compatibleModels: ['sm_basic'] },
  },
  { id: 'sm_std', name: '标准巡检车', serviceType: 'security', specs: '10km/次 · 陆空一体·热成像·3D建模', image: '/vehicle-security.png', coverageArea: 10000, boundPackage:
    { id: 'sp_standard', name: '标准巡检套餐', items: ['高清摄像头×2', '红外夜视', '双向对讲', '报警器'], price: 598, compatibleModels: ['sm_std'] },
  },
  { id: 'sm_adv', name: '移动哨兵车', serviceType: 'security', specs: 'AI抓拍取证·应急救援·AED', image: '/vehicle-security.png', coverageArea: 15000, boundPackage:
    { id: 'sp_advanced', name: '安防应急套餐', items: ['高清摄像头×4', '热成像', '双向对讲', '显示大屏', '警示灯', '警报器'], price: 898, compatibleModels: ['sm_adv'] },
  },
];

/* ────────────────────────── 类型 ────────────────────────── */
interface PackageSelection { packageId: string; quantity: number; }
interface LocationItem { id: string; location: string; duration: string; packageSelections: PackageSelection[]; }

function toShowcaseVehicles(models: LocalVehicleModel[]): ShowcaseVehicleData[] {
  return models.map((v) => ({
    id: v.id,
    name: v.name,
    shortName: getShortName(v.id, v.name),
    imageUrl: v.image,
    specLines: [v.specs],
    serviceType: v.serviceType,
    coverageArea: v.coverageArea,
    startingPrice: v.boundPackage ? `¥${v.boundPackage.price}/天` : undefined,
  }));
}

const VENDING_EXPECTED: Record<string, { dailySalesMin: number; dailySalesMax: number; dailyTraffic: string; roi: string }> = {
  'vm_std': { dailySalesMin: 800, dailySalesMax: 1200, dailyTraffic: '800+人/天', roi: '1:2.0' },
  'vm_smart': { dailySalesMin: 1500, dailySalesMax: 2500, dailyTraffic: '2000+人/天', roi: '1:3.0' },
  'vm_drink': { dailySalesMin: 1000, dailySalesMax: 1500, dailyTraffic: '1000+人/天', roi: '1:2.2' },
};

export function CruiseOrderPage({ page }: { page: SubPage }) {
  const { pushPage } = useAppStore();
  const { setCostBreakdown, setCruiseForm } = useOrderStore();
  const [serviceType, setServiceType] = useState<'vending' | 'security'>('vending');
  const [hasRoutePlan, setHasRoutePlan] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<AddressEntry[]>([]);
  const carouselRef = useRef<VehicleShowcaseCarouselHandle>(null);
  const handleSaveAddress = useCallback((entry: AddressEntry) => { setSavedAddresses((prev) => prev.some((e) => e.address === entry.address) ? prev : [entry, ...prev]); }, []);

  const handleShowcaseClick = (modelId: string) => {
    if (modelId !== vehicleModelId) setVehicleModelId(modelId);
    carouselRef.current?.scrollToVehicle(modelId);
  };

  // 车型 + 套餐（车型共享，套餐可按地点选不同）
  const [vehicleModelId, setVehicleModelId] = useState('');
  const [rentalDays, setRentalDays] = useState(1);

  // 提车地点列表（每个地点可有多个套餐选择）
  const [locations, setLocations] = useState<LocationItem[]>([
    { id: '1', location: '', duration: '', packageSelections: [] },
  ]);


  // 车型决定套餐：每地点车辆数（自动绑定所选车型的唯一套餐）
  const totalVehicleCount = locations.reduce((s, l) => s + (l.packageSelections.length > 0 ? l.packageSelections[0].quantity : 0), 0);

  // 地点操作
  const updateLocation = useCallback((id: string, field: keyof LocationItem, value: string | PackageSelection[]) => { setLocations((prev) => prev.map((o) => o.id === id ? { ...o, [field]: value } : o)); }, []);
  const addLocation = useCallback(() => { setLocations((prev) => [...prev, { id: String(Date.now()), location: '', duration: '', packageSelections: [] }]); }, []);
  const removeLocation = useCallback((id: string) => { setLocations((prev) => prev.length <= 1 ? prev : prev.filter((o) => o.id !== id)); }, []);

  // 套餐选择（每个地点独立）
  const togglePackageForLocation = (locId: string, pkgId: string) => {
    setLocations((prev) => prev.map((l) => {
      if (l.id !== locId) return l;
      const existing = l.packageSelections.find((ps) => ps.packageId === pkgId);
      if (existing) {
        return { ...l, packageSelections: l.packageSelections.map((ps) => ps.packageId === pkgId ? { ...ps, quantity: ps.quantity + 1 } : ps) };
      }
      return { ...l, packageSelections: [...l.packageSelections, { packageId: pkgId, quantity: 1 }] };
    }));
  };
  const updatePackageQtyForLocation = (locId: string, pkgId: string, qty: number) => {
    setLocations((prev) => prev.map((l) => {
      if (l.id !== locId) return l;
      if (qty <= 0) return { ...l, packageSelections: l.packageSelections.filter((ps) => ps.packageId !== pkgId) };
      return { ...l, packageSelections: l.packageSelections.map((ps) => ps.packageId === pkgId ? { ...ps, quantity: qty } : ps) };
    }));
  };

  const [expectedPickupTime, setExpectedPickupTime] = useState('');
  const [periodEnabled, setPeriodEnabled] = useState(false);
  const [periodFreq, setPeriodFreq] = useState<PeriodFreq>('每天');
  const [periodCustomDays, setPeriodCustomDays] = useState(2);
  const [periodDuration, setPeriodDuration] = useState<PeriodDuration>('一周');
  const [periodEnd, setPeriodEnd] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('full');
  const [autoPayAgreed, setAutoPayAgreed] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [patrolArea, setPatrolArea] = useState('');
  const [rentalPlanId, setRentalPlanId] = useState('');
  const [remark, setRemark] = useState('');

  const filteredModels = VEHICLE_MODELS.filter((v) => v.serviceType === serviceType);
  const showcaseVehicles = toShowcaseVehicles(filteredModels);
  const selectedModelData = VEHICLE_MODELS.find((v) => v.id === vehicleModelId);
  const boundPackage: PackageOption | undefined = selectedModelData?.boundPackage;
  const selectedRentalPlan = SECURITY_RENTAL_PLANS.find((rp) => rp.id === rentalPlanId);

  const handleServiceTypeChange = (type: 'vending' | 'security') => {
    setServiceType(type); setVehicleModelId(''); setRentalPlanId(''); setLocations([{ id: '1', location: '', duration: '', packageSelections: [] }]);
  };

  const recommendedVehicleCount = useMemo(() => {
    if (serviceType !== 'security' || !patrolArea || !selectedModelData?.coverageArea) return null;
    const area = parseFloat(patrolArea); if (isNaN(area) || area <= 0) return null;
    return Math.max(Math.ceil(area / selectedModelData.coverageArea), 1);
  }, [serviceType, patrolArea, selectedModelData]);

  // 费用
  const costEst = useMemo(() => {
    if (!selectedModelData) return null;
    const count = totalVehicleCount;
    const days = rentalDays;
    if (serviceType === 'vending') {
      let baseFee = 0;
      if (boundPackage) {
        for (const l of locations) {
          for (const ps of l.packageSelections) {
            baseFee += boundPackage.price * days * ps.quantity;
          }
        }
      }
      if (baseFee === 0) return null;
      const serviceFee = Math.round(baseFee * 0.1);
      const insuranceFee = 10 * days * count;
      return { type: 'vending' as const, baseFee, serviceFee, insuranceFee, discount: 0, total: baseFee + serviceFee + insuranceFee, label: `${days}天 · ${count}辆` };
    } else {
      if (!selectedRentalPlan || count === 0) return null;
      const totalVehicleCost = selectedRentalPlan.pricePerDay * 30 * count * selectedRentalPlan.months;
      const cloudControlFee = 300 * count;
      const insuranceFee = 600 * count;
      const maintenanceFee = 200 * count;
      const subtotal = totalVehicleCost + cloudControlFee + insuranceFee + maintenanceFee;
      const discount = selectedRentalPlan.discount ? Math.round(subtotal * (1 - parseFloat(selectedRentalPlan.discount) / 10)) : 0;
      return { type: 'security' as const, baseFee: totalVehicleCost, cloudControlFee, insuranceFee, maintenanceFee, discount, total: subtotal - discount, label: selectedRentalPlan.label };
    }
  }, [serviceType, selectedModelData, locations, rentalDays, selectedRentalPlan, totalVehicleCount]);

  // 周期费用（共享工具函数）
  const periodInfo = computePeriodInfo(periodEnabled, {
    periodFreq, periodCustomDays, periodDuration, periodEnd, paymentMode, autoPayAgreed,
  }, costEst?.total ?? 0);

  const displayTotal = getDisplayTotal(periodInfo, paymentMode, costEst?.total ?? 0);
  const displayLabel = getPaymentLabel(periodInfo, paymentMode, 1);

  // CSV
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; const lines = text.split('\n').filter((l) => l.trim()); if (lines.length < 2) return; setCsvPreviewData([lines[0].split(',').map((c) => c.trim()), ...lines.slice(1).map((l) => l.split(',').map((c) => c.trim()))]); setShowCsvPreview(true); };
    reader.readAsText(file); e.target.value = '';
  }, []);
  const confirmCsvImport = useCallback(() => {
    if (csvPreviewData.length < 2) return;
    setLocations((prev) => [...prev, ...csvPreviewData.slice(1).map((row, i) => ({ id: `csv-${Date.now()}-${i}`, location: row[0] || '', duration: row[1] || '', packageSelections: [] as PackageSelection[] }))]);
    setShowCsvPreview(false); setCsvPreviewData([]);
  }, [csvPreviewData]);
  const downloadTemplate = useCallback(() => { const h = serviceType === 'vending' ? '区域/地点,服务时长' : '巡检区域,服务时长'; const blob = new Blob([h + '\n'], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '巡游租车模板.csv'; a.click(); URL.revokeObjectURL(a.href); }, [serviceType]);

  // 从 store 恢复表单（从费用确认页返回时不丢数据）
  const savedCruiseForm = useOrderStore((s) => s.cruiseForm);
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    if (!savedCruiseForm.vehicleModelId && !savedCruiseForm.contactName && !savedCruiseForm.deliveryTime) return;
    restoredRef.current = true;
    if (savedCruiseForm.cruiseType) setServiceType(savedCruiseForm.cruiseType);
    if (savedCruiseForm.vehicleModelId) setVehicleModelId(savedCruiseForm.vehicleModelId);
    if (savedCruiseForm.duration) setRentalDays(savedCruiseForm.duration);
    if (savedCruiseForm.locations?.length) setLocations(savedCruiseForm.locations.map((l, i) => ({ id: String(Date.now() + i), location: l.location, duration: l.duration, packageSelections: [] as PackageSelection[] })));
    if (savedCruiseForm.contactName) setContactName(savedCruiseForm.contactName);
    if (savedCruiseForm.contactPhone) setContactPhone(savedCruiseForm.contactPhone);
    if (savedCruiseForm.patrolArea) setPatrolArea(savedCruiseForm.patrolArea);
    if (savedCruiseForm.rentalPlan) setRentalPlanId(savedCruiseForm.rentalPlan);
    if (savedCruiseForm.arrivalTime) setExpectedPickupTime(savedCruiseForm.arrivalTime);
    if (savedCruiseForm.periodEnabled !== undefined) setPeriodEnabled(savedCruiseForm.periodEnabled);
    if (savedCruiseForm.periodFreq) setPeriodFreq(savedCruiseForm.periodFreq as PeriodFreq);
    if (savedCruiseForm.periodCustomDays !== undefined) setPeriodCustomDays(savedCruiseForm.periodCustomDays);
    if (savedCruiseForm.periodDuration) setPeriodDuration(savedCruiseForm.periodDuration as PeriodDuration);
    if (savedCruiseForm.periodEnd) setPeriodEnd(savedCruiseForm.periodEnd);
    if (savedCruiseForm.paymentMode) setPaymentMode(savedCruiseForm.paymentMode as PaymentMode);
    if (savedCruiseForm.autoPayAgreed !== undefined) setAutoPayAgreed(savedCruiseForm.autoPayAgreed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!vehicleModelId) { setError('请选择车型'); return; }
    if (!contactName || !contactPhone) { setError('请填写联系人姓名和电话'); return; }
    if (locations.some((l) => !l.location)) { setError('请填写所有提车地点'); return; }
    if (serviceType === 'security' && !rentalPlanId) { setError('请选择租赁周期'); return; }
    if (!vehicleModelId) { setError('请选择车型'); return; }
    if (!boundPackage) { setError('所选车型无可用套餐'); return; }
    setError('');
    setCruiseForm({
      cruiseType: serviceType, vehicleModelId,
      vehicleSelections: [{ modelId: vehicleModelId, quantity: totalVehicleCount }],
      equipmentPackageId: boundPackage.id,
      packageSelections: [{ packageId: boundPackage.id, quantity: totalVehicleCount }],
      rentalPlan: rentalPlanId as 'hourly' | 'daily' | 'monthly_1' | 'monthly_3' | 'monthly_6' | undefined,
      vehicleCount: totalVehicleCount, duration: rentalDays,
      pickupLocation: locations[0]?.location || '',
      locations: locations.map((l) => ({ location: l.location, duration: l.duration })),
      contactName, contactPhone,
      patrolArea: patrolArea || undefined,
      deliveryTime: expectedPickupTime || undefined,
      arrivalTime: expectedPickupTime,
      periodEnabled, periodFreq, periodCustomDays, periodDuration, periodEnd, paymentMode, autoPayAgreed,
    });
    if (costEst) setCostBreakdown({ baseFee: costEst.baseFee, serviceFee: costEst.type === 'vending' ? costEst.serviceFee : undefined, packageFee: costEst.type === 'vending' ? costEst.baseFee : undefined, vehicleFee: costEst.type === 'security' ? costEst.baseFee : undefined, cloudControlFee: costEst.type === 'security' ? costEst.cloudControlFee : undefined, insuranceFee: costEst.insuranceFee, discount: costEst.type === 'security' ? costEst.discount : undefined, discountLabel: costEst.type === 'security' && selectedRentalPlan ? `${selectedRentalPlan.label}优惠` : undefined, distanceFee: 0, total: costEst.total, totalAmount: costEst.total });
    pushPage({ key: 'cost-confirm', data: { serviceType, vehicleModelId, packageId: boundPackage?.id, hasRoutePlan, batchCount: locations.length, vehicleCount: totalVehicleCount, rentalPlanId } });
  };
  void page;

  const locCount = locations.length;

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      <div className="bg-white border-b border-[#EEEEEE] shrink-0">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5">
          <button onClick={() => useAppStore.getState().popPage()} className="flex items-center gap-1 text-[#1677FF] active:opacity-60 justify-self-start"><ArrowLeft size={18} /><span className="text-[13px]">返回</span></button>
          <h1 className="text-[15px] font-medium text-[#1A1A1A]">巡游租车</h1><div />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-36">
        {/* 业务切换 */}
        <div className="px-4 pt-3">
          <div className="bg-white rounded-xl p-1 flex shadow-sm">
            <button onClick={() => handleServiceTypeChange('vending')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] transition-all ${serviceType === 'vending' ? 'bg-[#1677FF] text-white shadow-sm' : 'text-[#666666]'}`}><ShoppingCart size={14} />巡游贩卖</button>
            <button onClick={() => handleServiceTypeChange('security')} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] transition-all ${serviceType === 'security' ? 'bg-[#1677FF] text-white shadow-sm' : 'text-[#666666]'}`}><Shield size={14} />安防巡检</button>
          </div>
        </div>

        <div className="px-4 mt-3 space-y-3">
          {/* 车辆照片展示 */}
          <VehicleShowcaseCarousel
            ref={carouselRef}
            vehicles={showcaseVehicles}
            onVehicleClick={handleShowcaseClick}
            useFullName
          />

          {/* 配套与数量 */}
          <CruiseVehicleConfigurator
            vehicles={showcaseVehicles}
            selectedModelId={vehicleModelId}
            serviceType={serviceType}
            rentalDays={rentalDays}
            onRentalDaysChange={setRentalDays}
            locations={locations}
            onAddLocation={addLocation}
            onRemoveLocation={removeLocation}
            onUpdateLocation={updateLocation}
            onTogglePackage={togglePackageForLocation}
            onUpdatePackageQty={updatePackageQtyForLocation}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            onDownloadTemplate={downloadTemplate}
            showCsvPreview={showCsvPreview}
            csvPreviewData={csvPreviewData}
            onConfirmCsv={confirmCsvImport}
            onCancelCsv={() => { setShowCsvPreview(false); setCsvPreviewData([]); }}
            onSelectModel={(id) => {
              if (id === vehicleModelId) {
                setVehicleModelId('');
              } else {
                setVehicleModelId(id);
                // 车型决定套餐：自动绑定唯一套餐
                const m = VEHICLE_MODELS.find((v) => v.id === id);
                const pkgId = m?.boundPackage?.id;
                setLocations((prev) => prev.map((l) => (pkgId
                  ? { ...l, packageSelections: [{ packageId: pkgId, quantity: 1 }] }
                  : { ...l, packageSelections: [] }
                )));
              }
              carouselRef.current?.scrollToVehicle(id);
            }}
            boundPackage={boundPackage}
          />

          {/* 预期数据 */}
          {serviceType === 'vending' && selectedModelData && VENDING_EXPECTED[selectedModelData.id] && (
            <div className="bg-white rounded-xl p-3 shadow-sm">
              <SectionHeader icon={<TrendingUp size={14} className="text-[#52C41A]" />} title="预期参考数据" accent={false} />
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#F5F6FA] rounded-lg p-2 text-center"><p className="text-[10px] text-[#999999]">日均客流</p><p className="text-[14px] font-bold text-[#1A1A1A]">{VENDING_EXPECTED[selectedModelData.id].dailyTraffic}</p></div>
                <div className="bg-[#F5F6FA] rounded-lg p-2 text-center"><p className="text-[10px] text-[#999999]">日均销售额</p><p className="text-[14px] font-bold text-[#1A1A1A]">¥{VENDING_EXPECTED[selectedModelData.id].dailySalesMin}-{VENDING_EXPECTED[selectedModelData.id].dailySalesMax}</p></div>
                <div className="bg-[#F5F6FA] rounded-lg p-2 text-center"><p className="text-[10px] text-[#999999]">成本收益比</p><p className="text-[14px] font-bold text-[#52C41A]">{VENDING_EXPECTED[selectedModelData.id].roi}</p></div>
              </div>
            </div>
          )}

          {/* 安防：巡检配置 + 租赁周期 */}
          {serviceType === 'security' && selectedModelData && (
            <>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <SectionHeader icon={<MapPin size={14} className="text-[#1677FF]" />} title="巡检配置" accent={false} />
                <input type="text" placeholder="巡检区域面积（m²）" value={patrolArea} onChange={(e) => setPatrolArea(e.target.value)} className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                {recommendedVehicleCount && recommendedVehicleCount !== totalVehicleCount && (
                  <div className="mt-1.5"><span className="text-[10px] text-[#FAAD14]">建议 {recommendedVehicleCount} 台（当前 {totalVehicleCount} 台）</span></div>
                )}
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm">
                <SectionHeader icon={<Clock size={14} className="text-[#1677FF]" />} title="租赁周期" accent={false} />
                <div className="space-y-1.5">
                  {SECURITY_RENTAL_PLANS.map((plan) => {
                    const isSel = rentalPlanId === plan.id;
                    return (
                      <button key={plan.id} onClick={() => setRentalPlanId(plan.id)} className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all ${isSel ? 'border-[#1677FF] bg-[#E6F0FF]' : 'border-[#EEEEEE] bg-white hover:border-[#CCCCCC]'}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSel ? 'border-[#1677FF]' : 'border-[#CCCCCC]'}`}>{isSel && <div className="w-2 h-2 rounded-full bg-[#1677FF]" />}</div>
                        <span className="flex-1 text-left text-[12px] font-medium">{plan.label}</span>
                        <span className="text-[13px] font-medium">¥{plan.pricePerDay}/天</span>
                        {plan.discount && <span className="text-[10px] text-[#52C41A] bg-[#F6FFED] px-1.5 py-0.5 rounded shrink-0">{plan.discount}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* 期望提车时间 */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#1677FF]" />
                <span className="text-[13px] font-semibold text-[#1A1A1A]">期望提车时间</span>
              </div>
              <button onClick={() => setPeriodEnabled(!periodEnabled)} className={`text-[12px] transition-colors ${periodEnabled ? 'text-[#1677FF]' : 'text-[#999999]'}`}>
                {periodEnabled ? '✓' : '+'} 周期
              </button>
            </div>
            <TimeSlotPicker value={expectedPickupTime} onChange={setExpectedPickupTime} placeholder="选择期望提车时间" suffix="提车" />
            {periodEnabled && (
              <div className="mt-3 pt-3 border-t border-[#F0F0F0]">
                <PeriodSection
                  periodFreq={periodFreq}
                  onPeriodFreqChange={setPeriodFreq}
                  periodCustomDays={periodCustomDays}
                  onPeriodCustomDaysChange={setPeriodCustomDays}
                  periodDuration={periodDuration}
                  onPeriodDurationChange={setPeriodDuration}
                  periodEnd={periodEnd}
                  onPeriodEndChange={setPeriodEnd}
                  paymentMode={paymentMode}
                  onPaymentModeChange={setPaymentMode}
                />
              </div>
            )}
          </div>

          {/* 联系人 */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <SectionHeader icon={<span className="text-[13px]">👤</span>} title="联系人" accent={false} />
            <div className="flex gap-2">
              <input type="text" placeholder="姓名" value={contactName} onChange={(e) => setContactName(e.target.value)} className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0" />
              <input type="tel" placeholder="手机号" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="flex-1 px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0" />
            </div>
          </div>

          {/* 路线规划 */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between">
              <SectionHeader icon={<Route size={14} className="text-[#1677FF]" />} title="路线规划" accent={false} />
              <div className="flex items-center gap-2">
                <button onClick={() => { setHasRoutePlan(false); pushPage({ key: 'route-plan', data: { serviceType } }); }} className="text-[12px] text-[#1677FF] shrink-0">{hasRoutePlan ? '查看/修改' : '去规划'}</button>
                {!hasRoutePlan && <span className="text-[10px] text-[#999999]">可稍后</span>}
              </div>
            </div>
          </div>

          {/* 备注 */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <textarea placeholder="备注信息（选填）" value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] resize-none h-16" />
          </div>

          {/* 费用预估 */}
          {costEst && (
            <div className="bg-[#E6F0FF] rounded-xl p-3">
              <SectionHeader icon={<span className="text-[13px]">💰</span>} title="费用预估" accent={false} />
              <div className="space-y-2">
                {costEst.type === 'vending' ? (
                  <>
                    <div className="flex justify-between text-[12px]"><span className="text-[#666666]">套餐费用</span><span className="text-[#1A1A1A]">¥{costEst.baseFee.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[12px]"><span className="text-[#666666]">平台服务费（10%）</span><span className="text-[#1A1A1A]">¥{costEst.serviceFee.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[12px]"><span className="text-[#666666]">保险费</span><span className="text-[#1A1A1A]">¥{costEst.insuranceFee.toLocaleString()}</span></div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-[12px]"><span className="text-[#666666]">车辆租赁费</span><span className="text-[#1A1A1A]">¥{costEst.baseFee.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[12px]"><span className="text-[#666666]">云控管理</span><span className="text-[#1A1A1A]">¥{costEst.cloudControlFee.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[12px]"><span className="text-[#666666]">保险费</span><span className="text-[#1A1A1A]">¥{costEst.insuranceFee.toLocaleString()}</span></div>
                    <div className="flex justify-between text-[12px]"><span className="text-[#666666]">维修保养</span><span className="text-[#1A1A1A]">¥{costEst.maintenanceFee.toLocaleString()}</span></div>
                  </>
                )}
                {(costEst.discount ?? 0) > 0 && <div className="flex justify-between text-[12px]"><span className="text-[#666666]">优惠</span><span className="text-[#52C41A]">-¥{costEst.discount.toLocaleString()}</span></div>}
                <div className="border-t border-[#D6E4FF] pt-2 flex justify-between items-end">
                  <span className="text-[13px] font-medium">{displayLabel}</span>
                  <span className="text-[16px] font-bold text-[#FF4D4F]">¥{displayTotal.toLocaleString()}</span>
                </div>
                {periodInfo && (
                  <div className="mt-1 pt-1 border-t border-[#D6E4FF]/50 text-[10px] text-[#999999]">
                    周期：{periodFreq === '自定义' ? `每${periodCustomDays}天` : periodFreq} · {periodDuration}
                    {periodDuration === '自定义' && periodEnd ? ` · 至${parseInt(periodEnd.slice(5, 7))}月${parseInt(periodEnd.slice(8, 10))}日` : ''}
                    {paymentMode === 'auto' ? ' · 自动扣款' : ' · 一次付清'}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* 底部结算栏 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#EEEEEE] px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">{costEst && <div className="flex items-baseline gap-1"><span className="text-[12px] text-[#666666]">{displayLabel}</span><span className="text-[20px] font-bold text-[#FF4D4F]">¥{displayTotal.toLocaleString()}</span></div>}</div>
          <button
            onClick={() => {
              if (serviceType === 'vending' || serviceType === 'security') {
                toast('巡游贩卖/安防巡检功能即将上线，敬请期待！当前仅开放物流配送。');
                return;
              }
              handleSubmit();
            }}
            className={`shrink-0 px-8 py-2.5 text-white rounded-lg text-[14px] font-medium transition-colors ${!costEst ? 'bg-[#CCCCCC] cursor-pointer' : 'bg-[#1677FF] hover:bg-[#4096FF] active:bg-[#0958D9]'}`}
          >
            确认下单
          </button>
        </div>
        {error && <p className="text-[11px] text-[#FF4D4F] text-center mt-1.5">{error}</p>}
      </div>
    </div>
  );
}