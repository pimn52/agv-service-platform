'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import type { SubPage } from '@/store';
import { useOrderStore } from '@/store/use-order-store';
import type { CargoType, SpecialRequirement, RouteStop, LTLWaybill, FTLWaybill } from '@/types';
import { SPECIAL_REQUIREMENTS } from '@/constants/services';
import { SectionHeader } from '@/components/shared/section-header';
import { TimeSlotPicker } from '@/components/shared/time-slot-picker';
import { PeriodSection } from '@/components/shared/period-section';
import { computePeriodInfo, getPaymentLabel, getDisplayTotal } from '@/components/shared/period-utils';
import type { PeriodFreq, PeriodDuration, PaymentMode } from '@/components/shared/period-utils';
import { VehicleShowcaseCarousel } from './vehicle-showcase-carousel';
import type { VehicleShowcaseCarouselHandle } from './vehicle-showcase-carousel';
import { getLogisticsShowcaseVehicles } from './vehicle-data-helpers';
import { getCompatibleModels } from '@/lib/ltl-car-groups';
import { computeRebate, type RebateResult, type WaybillRebate, FULL_CAR_DISCOUNT_PER_WAYBILL } from '@/lib/rebate';
import {
  ArrowLeft, PlusCircle, Truck, Package, Trash2, Upload, Download, Clock,
} from 'lucide-react';

type FormDeliveryMode = 'full' | 'lcl';
interface VehicleSelection { modelId: string; quantity: number; }

let _stopSeq = 0;
function nextStopId() { _stopSeq++; return `stop-${Date.now()}-${_stopSeq}`; }
let _wbSeq = 0;
function nextWbId() { _wbSeq++; return `wb-${Date.now()}-${_wbSeq}`; }

export function DeliveryOrderPage({ page }: { page: SubPage }) {
  const { pushPage } = useAppStore();
  const { setCostBreakdown, setDeliveryForm, deliveryFormMode, setDeliveryFormMode } = useOrderStore();
  const mode = deliveryFormMode;
  const setMode = (m: FormDeliveryMode) => setDeliveryFormMode(m);
  const [error, setError] = useState('');

  const logisticsVehicles = getLogisticsShowcaseVehicles();

  // 经停点列表
  const [stops, setStops] = useState<RouteStop[]>([
    { id: nextStopId(), type: 'pickup', address: '', contactName: '', contactPhone: '', sequence: 0 },
    { id: nextStopId(), type: 'delivery', address: '', contactName: '', contactPhone: '', sequence: 1 },
  ]);
  const deliveryCount = stops.filter((s) => s.type === 'delivery').length;

  // 运单列表（散件直送）
  const [ltlWaybills, setLtlWaybills] = useState<LTLWaybill[]>([
    { id: nextWbId(), pickupAddress: '', pickupContactName: '', pickupContactPhone: '', deliveryAddress: '', deliveryContactName: '', deliveryContactPhone: '' },
  ]);
  const addWaybill = useCallback(() => {
    setLtlWaybills((prev) => [...prev, { id: nextWbId(), pickupAddress: '', pickupContactName: '', pickupContactPhone: '', deliveryAddress: '', deliveryContactName: '', deliveryContactPhone: '' }]);
  }, []);
  const updateWaybill = useCallback((id: string, updates: Partial<LTLWaybill>) => {
    setLtlWaybills((prev) => prev.map((w) => w.id === id ? { ...w, ...updates } : w));
  }, []);
  const removeWaybill = useCallback((id: string) => {
    setLtlWaybills((prev) => prev.length <= 1 ? prev : prev.filter((w) => w.id !== id));
  }, []);

  // 每张运单独立特殊要求展开状态
  const [waybillSpReqOpen, setWaybillSpReqOpen] = useState<Record<string, boolean>>({});

  // ── 整车运单（新模型：每运单 = 一辆车 + 经停点 + 货物）──
  const [ftlWaybills, setFtlWaybills] = useState<FTLWaybill[]>([
    {
      id: nextWbId(), vehicleModelId: '',
      stops: [
        { id: nextStopId(), type: 'pickup', address: '', contactName: '', contactPhone: '', sequence: 0 },
        { id: nextStopId(), type: 'delivery', address: '', contactName: '', contactPhone: '', sequence: 1 },
      ],
    },
  ]);
  // 订单级方向：null=未锁 / 'collection'=集货(N→1) / 'delivery'=配送(1→N)
  const [ftlDirection, setFtlDirection] = useState<'collection' | 'delivery' | null>(null);
  // 每张整车运单特殊要求展开
  const [ftlSpReqOpen, setFtlSpReqOpen] = useState<Record<string, boolean>>({});

  const addFtlWaybill = useCallback(() => {
    setFtlWaybills((prev) => {
      const first = prev[0];
      if (!first) return prev;
      const dir = ftlDirection;
      // 智能默认：复制第一张运单的第一个装货点（配送）或第一个卸货点（集货）
      const copyStop: RouteStop | undefined = dir === 'collection'
        ? first.stops.find((s) => s.type === 'delivery')
        : first.stops.find((s) => s.type === 'pickup');
      const newStops: RouteStop[] = [
        { id: nextStopId(), type: 'pickup', address: copyStop?.type === 'pickup' ? copyStop.address : '', contactName: copyStop?.type === 'pickup' ? copyStop.contactName : '', contactPhone: copyStop?.type === 'pickup' ? copyStop.contactPhone : '', sequence: 0 },
        { id: nextStopId(), type: 'delivery', address: copyStop?.type === 'delivery' ? copyStop.address : '', contactName: copyStop?.type === 'delivery' ? copyStop.contactName : '', contactPhone: copyStop?.type === 'delivery' ? copyStop.contactPhone : '', sequence: 1 },
      ];
      return [...prev, { id: nextWbId(), vehicleModelId: '', stops: newStops }];
    });
  }, [ftlDirection]);

  const updateFtlWaybill = useCallback((id: string, updates: Partial<FTLWaybill>) => {
    setFtlWaybills((prev) => prev.map((w) => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const removeFtlWaybill = useCallback((id: string) => {
    setFtlWaybills((prev) => prev.length <= 1 ? prev : prev.filter((w) => w.id !== id));
  }, []);

  // 整车运单 → 添加经停点（含方向锁定，仅操作当前运单）
  const addFtlStop = useCallback((wbId: string, type: 'pickup' | 'delivery') => {
    if (!ftlDirection) {
      if (type === 'pickup') setFtlDirection('collection');
      else setFtlDirection('delivery');
    }
    setFtlWaybills((prev) => prev.map((w) => {
      if (w.id !== wbId) return w;
      if (type === 'pickup') {
        const lastIdx = w.stops.map((s) => s.type).lastIndexOf('pickup');
        const newStop: RouteStop = { id: nextStopId(), type, address: '', contactName: '', contactPhone: '', sequence: lastIdx + 1 };
        const next = [...w.stops];
        next.splice(lastIdx + 1, 0, newStop);
        return { ...w, stops: next.map((s, i) => ({ ...s, sequence: i })) };
      } else {
        const newStop: RouteStop = { id: nextStopId(), type, address: '', contactName: '', contactPhone: '', sequence: w.stops.length };
        return { ...w, stops: [...w.stops, newStop].map((s, i) => ({ ...s, sequence: i })) };
      }
    }));
  }, [ftlDirection]);

  const removeFtlStop = useCallback((wbId: string, stopId: string) => {
    setFtlWaybills((prev) => {
      const next = prev.map((w) => {
        if (w.id !== wbId) return w;
        const target = w.stops.find((s) => s.id === stopId);
        if (!target) return w;
        if (w.stops.filter((s) => s.type === target.type).length <= 1) return w;
        return { ...w, stops: w.stops.filter((s) => s.id !== stopId).map((s, i) => ({ ...s, sequence: i })) };
      });
      // 如果所有运单都回到 1装1卸，解锁方向
      const allSimple = next.every((w) =>
        w.stops.filter((s) => s.type === 'pickup').length === 1 &&
        w.stops.filter((s) => s.type === 'delivery').length === 1
      );
      if (allSimple) setFtlDirection(null);
      return next;
    });
  }, []);

  const [arrivalTime, setArrivalTime] = useState('');
  const [timeAutoSet, setTimeAutoSet] = useState(false); // 首次提交时自动设为尽快
  const [periodEnabled, setPeriodEnabled] = useState(false);
  const [periodFreq, setPeriodFreq] = useState<PeriodFreq>('每天');
  const [periodCustomDays, setPeriodCustomDays] = useState(2);
  const [periodDuration, setPeriodDuration] = useState<PeriodDuration>('一周');
  const [periodEnd, setPeriodEnd] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('full');
  const [autoPayAgreed, setAutoPayAgreed] = useState(false);
  // 车型选择（保留用于旧 store 恢复兼容）
  const [vehicleSelections, setVehicleSelections] = useState<VehicleSelection[]>([]);

  // 货物类型
  const [cargoType, setCargoType] = useState<CargoType | ''>('');

  // 从实际 stops 结构自动推导方向锁（地址编辑回传/重新挂载后保持同步）
  useEffect(() => {
    const hasMultiPickup = ftlWaybills.some((w) => w.stops.filter((s) => s.type === 'pickup').length > 1);
    const hasMultiDelivery = ftlWaybills.some((w) => w.stops.filter((s) => s.type === 'delivery').length > 1);
    if (hasMultiPickup && !hasMultiDelivery) {
      setFtlDirection('collection');
    } else if (hasMultiDelivery && !hasMultiPickup) {
      setFtlDirection('delivery');
    } else if (!hasMultiPickup && !hasMultiDelivery) {
      setFtlDirection(null);
    }
  }, [ftlWaybills]);

  // 从 store 恢复后自动展开已有特殊要求的整车运单（防 remount 收起 UI）
  const autoExpandedRef = useRef(false);
  useEffect(() => {
    if (autoExpandedRef.current) return;
    const expandFtl: Record<string, boolean> = {};
    for (const wb of ftlWaybills) {
      if (wb.specialRequirements && wb.specialRequirements.length > 0) expandFtl[wb.id] = true;
    }
    if (Object.keys(expandFtl).length > 0) {
      autoExpandedRef.current = true;
      setFtlSpReqOpen((prev) => ({ ...prev, ...expandFtl }));
    }
  }, [ftlWaybills]);

  // 从 store 恢复后自动展开已有特殊要求的 LTL 运单（防 remount 收起 UI）
  const ltlAutoExpandedRef = useRef(false);
  useEffect(() => {
    if (ltlAutoExpandedRef.current) return;
    const expandLtl: Record<string, boolean> = {};
    for (const wb of ltlWaybills) {
      if (wb.specialRequirements && wb.specialRequirements.length > 0) expandLtl[wb.id] = true;
    }
    if (Object.keys(expandLtl).length > 0) {
      ltlAutoExpandedRef.current = true;
      setWaybillSpReqOpen((prev) => ({ ...prev, ...expandLtl }));
    }
  }, [ltlWaybills]);

  // 跳转地址编辑页前保存表单（防组件卸载丢失状态）
  const saveFormToStore = useCallback(() => {
    const shared = {
      cargoType: cargoType || undefined,
      deliveryTime: arrivalTime,
      arrivalTime,
      periodEnabled,
      periodFreq,
      periodCustomDays,
      periodDuration,
      periodEnd,
      paymentMode,
      autoPayAgreed,
    };
    if (mode === 'full') {
      setDeliveryForm({
        deliveryMode: 'full_load',
        ftlWaybills: ftlWaybills.map((w) => ({ ...w })),
        vehicleModelId: ftlWaybills[0]?.vehicleModelId || '',
        vehicleSelections: [],
        ...shared,
      });
    } else {
      setDeliveryForm({
        deliveryMode: 'ltl',
        ltlWaybills: ltlWaybills.map((w) => ({ ...w })),
        ...shared,
      });
    }
  }, [mode, ftlWaybills, ltlWaybills, cargoType, arrivalTime, periodEnabled, periodFreq, periodCustomDays, periodDuration, periodEnd, paymentMode, autoPayAgreed, setDeliveryForm]);

  // 从 store 恢复表单（首次挂载 / 从地址编辑/费用确认返回时保留数据）
  const savedForm = useOrderStore((s) => s.deliveryForm);
  const mountIdRef = useRef(0);
  useEffect(() => {
    // 首次挂载：先检查 sessionStorage 是否有地址编辑的待提交数据（优先级最高）
    const raw = sessionStorage.getItem('agv-addr-pending')
    if (raw) {
      sessionStorage.removeItem('agv-addr-pending')
      try {
        const data = JSON.parse(raw)
        if (data.mode === 'lcl' && data.ltlWaybills?.length) {
          setLtlWaybills(data.ltlWaybills)
          mountIdRef.current = Date.now()
          return // sessionStorage 数据优先，跳过 store 恢复
        } else if (data.mode === 'full' && data.ftlWaybills?.length) {
          setFtlWaybills(data.ftlWaybills as FTLWaybill[])
          mountIdRef.current = Date.now()
          return // sessionStorage 数据优先
        }
      } catch { /* ignore parse errors */ }
    }

    // 仅首次挂载时从 store 恢复表单
    if (mountIdRef.current > 0) return;
    mountIdRef.current = Date.now();
    if (savedForm.deliveryMode === 'full_load') {
      const hasFtl = savedForm.ftlWaybills.length > 0;
      const hasSelections = savedForm.vehicleSelections.length > 0;
      if (!hasFtl && !hasSelections) return;
      if (hasFtl) setFtlWaybills(savedForm.ftlWaybills);
      if (hasSelections) setVehicleSelections(savedForm.vehicleSelections);
    } else {
      const hasLtl = savedForm.ltlWaybills.length > 0;
      if (!hasLtl) return;
      setLtlWaybills(savedForm.ltlWaybills);
    }
    if (savedForm.cargoType) setCargoType(savedForm.cargoType as CargoType);
    if (savedForm.arrivalTime) setArrivalTime(savedForm.arrivalTime);
    if (savedForm.periodEnabled !== undefined) setPeriodEnabled(savedForm.periodEnabled);
    if (savedForm.periodFreq) setPeriodFreq(savedForm.periodFreq as PeriodFreq);
    if (savedForm.periodCustomDays !== undefined) setPeriodCustomDays(savedForm.periodCustomDays);
    if (savedForm.periodDuration) setPeriodDuration(savedForm.periodDuration as PeriodDuration);
    if (savedForm.periodEnd) setPeriodEnd(savedForm.periodEnd);
    if (savedForm.paymentMode) setPaymentMode(savedForm.paymentMode as PaymentMode);
    if (savedForm.autoPayAgreed !== undefined) setAutoPayAgreed(savedForm.autoPayAgreed);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedForm]);

  // CSV 批量导入
  const [showCsvPreview, setShowCsvPreview] = useState(false);
  const [csvPreviewData, setCsvPreviewData] = useState<string[][]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const text = ev.target?.result as string; const lines = text.split('\n').filter((l) => l.trim()); if (lines.length < 2) return; setCsvPreviewData([lines[0].split(',').map((h) => h.trim()), ...lines.slice(1).map((l) => l.split(',').map((c) => c.trim()))]); setShowCsvPreview(true); };
    reader.readAsText(file); e.target.value = '';
  }, []);
  const confirmCsvImport = useCallback(() => {
    if (csvPreviewData.length < 2) return;
    const header = csvPreviewData[0];
    const newStops: RouteStop[] = csvPreviewData.slice(1).map((row) => ({
      id: nextStopId(), type: 'delivery' as const, address: row[header.indexOf('收货地址')] || row[0] || '', contactName: row[header.indexOf('收货人')] || row[1] || '', contactPhone: row[header.indexOf('收货电话')] || row[2] || '', sequence: 0,
    }));
    if (mode === 'full') {
      // FTL：追加到第一个运单（后续可扩展为目标运单选择）
      setFtlWaybills((prev) => prev.map((wb, i) => {
        if (i !== 0) return wb;
        const merged = [...wb.stops, ...newStops];
        return { ...wb, stops: merged.map((s, idx) => ({ ...s, sequence: idx })) };
      }));
    } else {
      // LTL：CSV 行转为运单（仅含收件信息，投件方待用户补充）
      const importedWaybills: LTLWaybill[] = newStops.map((s) => ({
        id: nextWbId(),
        pickupAddress: '',
        pickupContactName: '',
        pickupContactPhone: '',
        deliveryAddress: s.address,
        deliveryContactName: s.contactName,
        deliveryContactPhone: s.contactPhone,
      }));
      setLtlWaybills((prev) => [...prev, ...importedWaybills]);
    }
    setShowCsvPreview(false); setCsvPreviewData([]);
  }, [csvPreviewData, mode]);
  const downloadTemplate = useCallback(() => { const csv = '收货地址,收货人,收货电话\n杭州市西湖区××路,张三,13800000000'; const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '配送批量导入模板.csv'; a.click(); URL.revokeObjectURL(a.href); }, []);

  const carouselRef = useRef<VehicleShowcaseCarouselHandle>(null);
  const handleShowcaseClick = (modelId: string) => {
    carouselRef.current?.scrollToVehicle(modelId);
  };

  // 夜间 8折：22:00-06:00 配送享 15% 折扣
  const isNightDelivery = (() => {
    if (!arrivalTime) return false;
    const match = arrivalTime.match(/(\d{2}):\d{2}/);
    if (!match) return false;
    const hour = parseInt(match[1], 10);
    return hour >= 22 || hour < 6;
  })();
  const NIGHT_DISCOUNT_RATE = 0.20; // 8折

  // 费用
  const costEst = (() => {
    if (mode === 'full') {
      const wbCount = ftlWaybills.length;
      if (wbCount === 0) return null;
      const m: Record<string, number> = { lm_z2: 0.7, lm_z5: 1.0, lm_x3: 0.85, lm_x6: 1.2, lm_e6: 0.9 };
      // 按每张运单的车型分别计算再汇总（单位：分）
      let total = 0;
      let totalBaseFee = 0;
      let totalDistanceFee = 0;
      let totalSurcharge = 0;
      let totalInsurance = 0;
      let totalDiscount = 0;
      let totalNightDiscount = 0;
      for (const wb of ftlWaybills) {
        const mult = m[wb.vehicleModelId] ?? 1.0;
        const baseFee = Math.round(3500 * mult);       // ¥35 → 3500分
        const distanceFee = Math.round(5250 * mult);    // ¥52.5 → 5250分
        const deliveryStops = wb.stops.filter((s) => s.type === 'delivery').length;
        const surcharge = wb.specialRequirements?.includes('cold_chain') ? 1800 : 0;  // ¥18
        const insuranceFee = 200;                        // ¥2
        const discount = deliveryStops > 1 ? -800 : -300; // ¥8/¥3
        const nightDisc = isNightDelivery ? -Math.round((baseFee + distanceFee) * NIGHT_DISCOUNT_RATE) : 0;
        total += baseFee + distanceFee + surcharge + insuranceFee + discount + nightDisc;
        totalBaseFee += baseFee;
        totalDistanceFee += distanceFee;
        totalSurcharge += surcharge;
        totalInsurance += insuranceFee;
        totalDiscount += discount;
        totalNightDiscount += nightDisc;
      }
      return { distanceFee: totalDistanceFee, discount: totalDiscount, baseFee: totalBaseFee, surcharge: totalSurcharge, insuranceFee: totalInsurance, nightDiscount: totalNightDiscount, total, perOrder: total / wbCount, orderCount: wbCount, coldChainCount: 0, rebateResult: null as RebateResult | null };
    }
    const n = ltlWaybills.length;
    const baseFeePer = 2000;                               // ¥20/运单
    const insurancePer = 200;                              // ¥2/运单
    const baseFee = baseFeePer * n;
    let surcharge = 0;
    let coldChainCount = 0;
    for (const wb of ltlWaybills) {
      if (wb.specialRequirements?.includes('cold_chain')) { surcharge += 1800; coldChainCount++; }
    }
    const insuranceFee = insurancePer * n;
    const nightDisc = isNightDelivery ? -Math.round(baseFee * NIGHT_DISCOUNT_RATE) : 0;
    // 独占一车减免：按车分包，逐车判定满/不满
    let exclusiveDiscount = 0;
    let rebateResult: RebateResult | null = null;
    if (n >= 2) {
      const dummyOrder = { ltlWaybills, serviceType: 'logistics' as const, deliveryMode: 'ltl' as const } as import('@/types').Order;
      rebateResult = computeRebate(dummyOrder);
      // eslint-disable-next-line no-console
      if (rebateResult && rebateResult.fullCarDiscountTotal > 0) {
        exclusiveDiscount = -(rebateResult.fullCarDiscountTotal * 100); // 转分，负数为减项
      }
    }
    const total = baseFee + surcharge + insuranceFee + nightDisc + exclusiveDiscount;
    return { distanceFee: 0, discount: exclusiveDiscount, baseFee, surcharge, insuranceFee, nightDiscount: nightDisc, total, perOrder: total / n, orderCount: n, coldChainCount, rebateResult };
  })();

  // 周期费用（共享工具函数）
  const periodInfo = computePeriodInfo(periodEnabled, {
    periodFreq, periodCustomDays, periodDuration, periodEnd, paymentMode, autoPayAgreed,
  }, costEst?.total ?? 0);

  // 统一应付金额（费用卡片 & 底部栏共用）
  const displayTotal = getDisplayTotal(periodInfo, paymentMode, costEst?.total ?? 0);
  const displayLabel = getPaymentLabel(periodInfo, paymentMode, costEst?.orderCount ?? 1);
  const unitLabel = mode === 'full' ? '车' : '单';

  const handleSubmit = () => {
    // 首次提交未选择时间 → 自动设为"尽快"并提示
    if (!arrivalTime && !timeAutoSet) {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const h = now.getHours();
      const m = now.getMinutes() < 30 ? 0 : 30;
      const startH = m === 0 ? h : h + 1;
      const endH = m === 0 ? h + 1 : h + 2;
      const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
      const timeStr = `${pad(Math.min(startH, 23))}:${pad(m)}-${pad(Math.min(endH, 23))}:${pad(m === 0 ? 30 : 0)}`;
      setArrivalTime(`${dateStr} ${timeStr}`);
      setTimeAutoSet(true);
      setError('未选择期望配送时间，已默认为尽快送达，请再次确认下单');
      return;
    }
    if (mode === 'full') {
      if (ftlWaybills.some((w) => !w.vehicleModelId)) {
        setError('每张运单请选择车型');
        return;
      }
      for (const wb of ftlWaybills) {
        if (wb.stops.some((s) => !s.address || !s.contactName || !s.contactPhone)) {
          setError('请填写完整的经停点信息（地址、姓名、电话）');
          return;
        }
      }
      setError('');
      // 不展平 ftlWaybills，保持运单独立身份，供后续一订多车推进
      const sel = ftlWaybills.map((w) => ({ modelId: w.vehicleModelId, quantity: 1 }));
      setDeliveryForm({ deliveryMode: 'full_load', ftlWaybills: ftlWaybills.map((w) => ({ ...w })), vehicleModelId: ftlWaybills[0]?.vehicleModelId || '', vehicleSelections: sel, cargoType: cargoType || undefined, deliveryTime: arrivalTime, arrivalTime, periodEnabled, periodFreq, periodCustomDays, periodDuration, periodEnd, paymentMode, autoPayAgreed });
    } else {
      if (ltlWaybills.some((w) => !w.pickupAddress || !w.pickupContactName || !w.pickupContactPhone || !w.deliveryAddress || !w.deliveryContactName || !w.deliveryContactPhone)) {
        setError('请填写所有运单的完整信息（投件方、取件方）');
        return;
      }
      setError('');
      setDeliveryForm({ deliveryMode: 'ltl', ltlWaybills: ltlWaybills, cargoType: cargoType || undefined, deliveryTime: arrivalTime, arrivalTime, periodEnabled, periodFreq, periodCustomDays, periodDuration, periodEnd, paymentMode, autoPayAgreed });
    }
    setCostBreakdown({ baseFee: costEst!.baseFee, distanceFee: costEst!.distanceFee, insuranceFee: costEst!.insuranceFee, discount: costEst!.discount < 0 ? Math.abs(costEst!.discount) : undefined, discountLabel: costEst!.discount < 0 ? (mode === 'lcl' ? '独占一车减免' : costEst!.orderCount > 1 ? '批量优惠' : '平台补贴') : undefined, nightDiscount: (costEst!.nightDiscount ?? 0) < 0 ? Math.abs(costEst!.nightDiscount ?? 0) : undefined, total: costEst!.total, totalAmount: costEst!.total });
    pushPage({ key: 'cost-confirm', data: { serviceType: 'logistics', mode, vehicleModelId: ftlWaybills[0]?.vehicleModelId || vehicleSelections[0]?.modelId, batchCount: costEst!.orderCount, cargoType: cargoType || undefined } });
  };

  void page;

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      {/* 顶部 */}
      <div className="bg-white border-b border-[#EEEEEE] shrink-0">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-3 py-2.5">
          <button onClick={() => useAppStore.getState().popPage()} className="flex items-center gap-1 text-[#1677FF] active:opacity-60 justify-self-start"><ArrowLeft size={18} /><span className="text-[13px]">返回</span></button>
          <h1 className="text-[15px] font-medium text-[#1A1A1A]">配送下单</h1><div />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-36">
        {/* 模式切换 */}
        <div className="px-4 pt-3">
          <div className="bg-white rounded-xl p-1 flex shadow-sm">
            <button onClick={() => { setMode('full'); setVehicleSelections([]); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] transition-all ${mode === 'full' ? 'bg-[#1677FF] text-white shadow-sm' : 'text-[#666666]'}`}><Truck size={14} />整车配送</button>
            <button onClick={() => { setMode('lcl'); setVehicleSelections([]); }} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[13px] transition-all ${mode === 'lcl' ? 'bg-[#1677FF] text-white shadow-sm' : 'text-[#666666]'}`}><Package size={14} />散件直送</button>
          </div>
        </div>

        <div className="px-4 mt-3 space-y-3">
          {/* ─── 整车配送 ─── */}
          {mode === 'full' && (
            <>
              {/* 车辆照片展示（保持不动） */}
              <VehicleShowcaseCarousel
                ref={carouselRef}
                vehicles={logisticsVehicles}
                onVehicleClick={handleShowcaseClick}
              />

              {ftlDirection && (
                <div className="bg-[#E6F0FF] rounded-lg px-3 py-2 text-[11px] text-[#1677FF]">
                  {ftlDirection === 'delivery' ? '配送模式：1个装货点 → 多个卸货点' : '集货模式：多个装货点 → 1个卸货点'}
                </div>
              )}

              {/* 整车运单列表 */}
              {ftlWaybills.map((wb, wi) => {
                const wbCanAddPickup = !ftlDirection || ftlDirection === 'collection';
                const wbCanAddDelivery = !ftlDirection || ftlDirection === 'delivery';
                return (
                  <div key={wb.id} className="bg-white rounded-xl p-3 shadow-sm">
                    {/* 运单标题（仅多运单时显示） */}
                    {ftlWaybills.length > 1 && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Truck size={13} className="text-[#1677FF] shrink-0" />
                        <span className="text-[13px] font-semibold text-[#1A1A1A]">运单 {wi + 1}</span>
                        <button onClick={() => removeFtlWaybill(wb.id)} className="ml-auto flex items-center gap-0.5 text-[12px] text-[#999999] hover:text-[#FF4D4F] transition-colors"><Trash2 size={12} />删除</button>
                      </div>
                    )}

                    {/* 车型选择 */}
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-2">
                      {(() => {
                        const compatibleModels = wb.specialRequirements?.length
                          ? getCompatibleModels(wb.specialRequirements as import('@/types').SpecialRequirement[])
                          : null;
                        const filteredVehicles = compatibleModels
                          ? logisticsVehicles.filter(v => compatibleModels.includes(v.id))
                          : logisticsVehicles;
                        if (filteredVehicles.length === 0) {
                          return <span className="text-[11px] text-[#FF4D4F] py-1">当前特殊要求无兼容车型</span>;
                        }
                        return filteredVehicles.map((v) => {
                          const selected = wb.vehicleModelId === v.id;
                          return (
                            <button
                              key={v.id}
                              onClick={() => { updateFtlWaybill(wb.id, { vehicleModelId: selected ? '' : v.id, vehicleModelName: selected ? undefined : v.name }); if (!selected) carouselRef.current?.scrollToVehicle(v.id); }}
                              className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-colors duration-200
                                ${selected ? 'bg-[#1677FF] text-white' : 'bg-[#F5F6FA] text-[#666666] border border-transparent hover:border-[#CCCCCC]'}`}
                            >
                              {v.shortName}
                            </button>
                          );
                        });
                      })()}
                    </div>
                    {wb.vehicleModelId && (
                      <div className="flex items-center gap-2 mb-2">
                        {(() => { const v = logisticsVehicles.find((m) => m.id === wb.vehicleModelId); if (!v) return null; return <><img src={v.imageUrl} alt="" className="w-6 h-6 object-contain shrink-0 rounded" /><span className="text-[11px] text-[#666666]">{v.name}</span></>; })()}
                      </div>
                    )}

                    {/* 经停点 */}
                    {wb.stops.map((s, idx) => {
                      const isPickup = s.type === 'pickup';
                      const iconLabel = isPickup ? '发' : '收';
                      const iconBg = isPickup ? 'bg-[#E6F0FF]' : 'bg-[#F6FFED]';
                      const iconColor = isPickup ? 'text-[#1677FF]' : 'text-[#52C41A]';
                      const isFirst = idx === 0;
                      const isLast = idx === wb.stops.length - 1;
                      return (
                        <div key={s.id} className="flex items-center gap-2.5 py-1.5 border-b border-[#F5F6FA] last:border-b-0">
                          <button
                            onClick={() => { saveFormToStore(); pushPage({ key: 'address-edit', data: { stops: wb.stops, mode: 'full', currentWaybillId: wb.id, ftlWaybills } }); }}
                            className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                          >
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${iconBg} shadow-sm`}>
                              <span className={`text-[12px] font-bold ${iconColor}`}>{iconLabel}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[12px] text-[#1A1A1A] truncate">
                                {s.address || (isPickup ? '请填写装货地址' : '请填写卸货地址')}
                              </p>
                              <p className="text-[10px] text-[#999999] mt-0.5 truncate">
                                {s.contactName ? `${s.contactName} · ${s.contactPhone}` : '请填写联系人'}
                              </p>
                            </div>
                          </button>
                          {isFirst && wbCanAddPickup ? (
                            <button onClick={(e) => { e.stopPropagation(); addFtlStop(wb.id, 'pickup'); }}
                              className="shrink-0 flex items-center gap-0.5 text-[11px] text-[#999999] hover:text-[#1677FF] transition-colors">
                              <PlusCircle size={11} />装货
                            </button>
                          ) : isLast && wbCanAddDelivery ? (
                            <button onClick={(e) => { e.stopPropagation(); addFtlStop(wb.id, 'delivery'); }}
                              className="shrink-0 flex items-center gap-0.5 text-[11px] text-[#999999] hover:text-[#1677FF] transition-colors">
                              <PlusCircle size={11} />卸货
                            </button>
                          ) : (!isFirst && !isLast) ? (
                            <button onClick={(e) => { e.stopPropagation(); removeFtlStop(wb.id, s.id); }}
                              className="shrink-0 flex items-center gap-0.5 text-[11px] text-[#999999] hover:text-[#FF4D4F] transition-colors">
                              <Trash2 size={11} />删除
                            </button>
                          ) : null}
                        </div>
                      );
                    })}

                    {/* 货物配置 */}
                    <div className="flex items-center gap-2 mt-2">
                      <input type="text" placeholder="货物名称" value={wb.cargoDescription || ''}
                        onChange={(e) => updateFtlWaybill(wb.id, { cargoDescription: e.target.value })}
                        className="flex-1 px-2.5 py-1.5 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0" />
                      <input type="text" placeholder="重量kg" value={wb.cargoWeight ? String(wb.cargoWeight) : ''}
                        onChange={(e) => { const v = parseFloat(e.target.value); updateFtlWaybill(wb.id, { cargoWeight: isNaN(v) ? undefined : v }); }}
                        className="w-16 px-2.5 py-1.5 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                      <button onClick={() => setFtlSpReqOpen((prev) => ({ ...prev, [wb.id]: !prev[wb.id] }))}
                        className={`shrink-0 text-[11px] transition-colors ${ftlSpReqOpen[wb.id] ? 'text-[#1677FF]' : 'text-[#999999]'}`}>
                        {ftlSpReqOpen[wb.id] ? '✓' : '+'} 特殊要求
                      </button>
                    </div>
                    {ftlSpReqOpen[wb.id] && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {SPECIAL_REQUIREMENTS.map((req) => {
                          const checked = wb.specialRequirements?.includes(req.key);
                          return (
                            <button key={req.key}
                              onClick={() => {
                                const cur = wb.specialRequirements || [];
                                if (cur.includes(req.key)) {
                                  // 取消勾选，不需要检查
                                  updateFtlWaybill(wb.id, { specialRequirements: cur.filter((r) => r !== req.key) });
                                } else {
                                  // 勾选新特殊要求，检查当前车型是否兼容
                                  const newReqs = [...cur, req.key];
                                  const compatModels = getCompatibleModels(newReqs as import('@/types').SpecialRequirement[]);
                                  if (wb.vehicleModelId && !compatModels.includes(wb.vehicleModelId)) {
                                    // 当前车型不兼容，清除车型选择
                                    updateFtlWaybill(wb.id, { specialRequirements: newReqs, vehicleModelId: '', vehicleModelName: undefined });
                                    return;
                                  }
                                  updateFtlWaybill(wb.id, { specialRequirements: newReqs });
                                }
                              }}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] border transition-all ${checked ? 'border-[#1677FF] bg-[#E6F0FF] text-[#1677FF]' : 'border-[#EEEEEE] bg-white text-[#666666] hover:border-[#CCCCCC]'}`}>
                              <span className="text-[11px]">{req.icon}</span>{req.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* 添加运单 + 批量操作 */}
              <div className="flex items-center gap-2">
                <button onClick={addFtlWaybill}
                  className="flex-1 py-2 rounded-lg border border-dashed border-[#1677FF] text-[12px] text-[#1677FF] flex items-center justify-center gap-1 hover:bg-[#E6F0FF] transition-colors">
                  <PlusCircle size={12} />添加车辆/运单
                </button>
                <label className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[#EEEEEE] text-[11px] text-[#666666] hover:bg-[#F5F6FA] transition-colors cursor-pointer py-2">
                  <Upload size={12} />从CSV导入
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button onClick={downloadTemplate} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[#EEEEEE] text-[11px] text-[#666666] hover:bg-[#F5F6FA] transition-colors">
                  <Download size={12} />下载模板
                </button>
              </div>

            </>
          )}

          {/* ─── 散件直送 ─── */}
          {mode === 'lcl' && (
            <>
              <div className="bg-[#E6F0FF] rounded-xl p-3 flex items-start gap-2">
                <Package size={16} className="text-[#1677FF] shrink-0 mt-0.5" />
                <div><p className="text-[12px] font-medium text-[#1677FF]">散件直送</p><p className="text-[11px] text-[#666666] mt-0.5">每张运单 1 对 1 投取，系统智能拼车调度，无需选车型</p></div>
              </div>
              {ltlWaybills.map((w, idx) => (
                <div key={w.id} className="bg-white rounded-xl p-3 shadow-sm">
                  {ltlWaybills.length > 1 && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Package size={13} className="text-[#1677FF] shrink-0" />
                      <span className="text-[13px] font-semibold text-[#1A1A1A]">运单 {idx + 1}</span>
                      <button onClick={() => removeWaybill(w.id)} className="ml-auto flex items-center gap-0.5 text-[12px] text-[#999999] hover:text-[#FF4D4F] transition-colors"><Trash2 size={12} />删除</button>
                    </div>
                  )}
                  <button onClick={() => { saveFormToStore(); pushPage({ key: 'address-edit', data: { stops: [], mode: 'lcl', ltlWaybills: ltlWaybills, currentWaybillId: w.id } }); }} className="w-full text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[#E6F0FF] flex items-center justify-center shrink-0 shadow-sm"><span className="text-[13px] font-bold text-[#1677FF]">发</span></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#1A1A1A] truncate">{w.pickupAddress || '请填写投件地址'}</p>
                        <p className="text-[11px] text-[#999999] mt-0.5 truncate">{w.pickupContactName ? `${w.pickupContactName} · ${w.pickupContactPhone}` : '请填写联系人'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="w-7 h-7 rounded-full bg-[#F6FFED] flex items-center justify-center shrink-0 shadow-sm"><span className="text-[13px] font-bold text-[#52C41A]">收</span></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] text-[#1A1A1A] truncate">{w.deliveryAddress || '请填写取件地址'}</p>
                        <p className="text-[11px] text-[#999999] mt-0.5 truncate">{w.deliveryContactName ? `${w.deliveryContactName} · ${w.deliveryContactPhone}` : '请填写联系人'}</p>
                      </div>
                    </div>
                  </button>
                  {/* 货物信息 */}
                  <div className="flex items-center gap-2 mt-2 ">
                    <input type="text" placeholder="货物名称" value={w.cargoDescription || ''} onChange={(e) => updateWaybill(w.id, { cargoDescription: e.target.value })} className="flex-1 px-2.5 py-1.5 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] min-w-0" />
                    <input type="text" placeholder="重量kg" value={w.cargoWeight ? String(w.cargoWeight) : ''} onChange={(e) => { const v = parseFloat(e.target.value); updateWaybill(w.id, { cargoWeight: isNaN(v) ? undefined : v }); }} className="w-16 px-2.5 py-1.5 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF]" />
                    <button onClick={() => setWaybillSpReqOpen((prev) => ({ ...prev, [w.id]: !prev[w.id] }))} className={`shrink-0 text-[11px] transition-colors ${waybillSpReqOpen[w.id] ? 'text-[#1677FF]' : 'text-[#999999]'}`}>
                      {waybillSpReqOpen[w.id] ? '✓' : '+'} 特殊要求
                    </button>
                  </div>
                  {/* 特殊要求 — 勾选后展开 */}
                  {waybillSpReqOpen[w.id] && (
                    <div className="flex flex-wrap gap-2 mt-2 ">
                      {SPECIAL_REQUIREMENTS.map((req) => { const cur = w.specialRequirements || []; const checked = cur.includes(req.key); return <button key={req.key} onClick={() => { updateWaybill(w.id, { specialRequirements: cur.includes(req.key) ? cur.filter(r => r !== req.key) : [...cur, req.key] }); }} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] border transition-all ${checked ? 'border-[#1677FF] bg-[#E6F0FF] text-[#1677FF]' : 'border-[#EEEEEE] bg-white text-[#666666] hover:border-[#CCCCCC]'}`}><span className="text-[12px]">{req.icon}</span>{req.label}</button>; })}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-2">
                <button onClick={addWaybill} className="flex-1 py-2 rounded-lg border border-dashed border-[#1677FF] text-[12px] text-[#1677FF] flex items-center justify-center gap-1 hover:bg-[#E6F0FF] transition-colors"><PlusCircle size={12} />添加运单</button>
                <label className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[#EEEEEE] text-[11px] text-[#666666] hover:bg-[#F5F6FA] transition-colors cursor-pointer py-2">
                  <Upload size={12} />从CSV导入
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <button onClick={downloadTemplate} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[#EEEEEE] text-[11px] text-[#666666] hover:bg-[#F5F6FA] transition-colors">
                  <Download size={12} />下载模板
                </button>
              </div>
            </>
          )}
          {showCsvPreview && csvPreviewData.length > 1 && (
            <div className="p-2 bg-[#F5F6FA] rounded-lg border border-[#1677FF]">
              <div className="flex items-center justify-between mb-1.5"><span className="text-[11px] font-medium text-[#1677FF]">识别到 {csvPreviewData.length - 1} 条</span><div className="flex gap-2"><button onClick={() => { setShowCsvPreview(false); setCsvPreviewData([]); }} className="text-[10px] text-[#999999]">取消</button><button onClick={confirmCsvImport} className="text-[10px] text-[#1677FF] font-medium">确认导入</button></div></div>
              <div className="overflow-x-auto"><table className="w-full text-[10px]"><thead><tr className="bg-white">{csvPreviewData[0].map((h, i) => <th key={i} className="px-1.5 py-1 text-left text-[#999999]">{h}</th>)}</tr></thead><tbody>{csvPreviewData.slice(1, 4).map((row, ri) => <tr key={ri}>{row.map((c, ci) => <td key={ci} className="px-1.5 py-0.5 text-[#666666]">{c}</td>)}</tr>)}{csvPreviewData.length > 4 && <tr><td colSpan={csvPreviewData[0].length} className="px-1.5 py-0.5 text-[#999999] text-center">...共 {csvPreviewData.length - 1} 条</td></tr>}</tbody></table></div>
            </div>
          )}

          {/* 期望时间 */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-[#1677FF]" />
                <span className="text-[13px] font-semibold text-[#1A1A1A]">期望配送时间</span>
              </div>
              <button onClick={() => setPeriodEnabled(!periodEnabled)} className={`text-[12px] transition-colors ${periodEnabled ? 'text-[#1677FF]' : 'text-[#999999]'}`}>
                {periodEnabled ? '✓' : '+'} 周期
              </button>
            </div>
            <TimeSlotPicker value={arrivalTime} onChange={(v) => { setArrivalTime(v); if (v) setTimeAutoSet(false); }} placeholder="选择期望配送时间" />
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

          {/* 备注 */}
          <div className="bg-white rounded-xl p-3 shadow-sm">
            <textarea placeholder="备注信息（选填）" className="w-full px-3 py-2 bg-[#F5F6FA] rounded-lg text-[12px] outline-none focus:ring-1 focus:ring-[#1677FF] resize-none h-16" />
          </div>

          {/* 费用预估 */}
          {costEst && (
            <div className="bg-[#E6F0FF] rounded-xl p-3">
              <SectionHeader icon={<span className="text-[13px]">💰</span>} title="费用预估" accent={false} />
              <div className="space-y-2">
                <div className="flex justify-between text-[12px]"><span className="text-[#666666]">基础运费</span><span className="text-[#1A1A1A]">{costEst.orderCount > 1 ? `¥${(costEst.baseFee / 100 / costEst.orderCount).toFixed(2)} × ${costEst.orderCount}${unitLabel}` : `¥${(costEst.baseFee / 100).toFixed(2)}`}</span></div>
                {costEst.distanceFee > 0 && <div className="flex justify-between text-[12px]"><span className="text-[#666666]">里程费</span><span className="text-[#1A1A1A]">{costEst.orderCount > 1 ? `¥${(costEst.distanceFee / 100 / costEst.orderCount).toFixed(2)} × ${costEst.orderCount}${unitLabel}` : `¥${(costEst.distanceFee / 100).toFixed(2)}`}</span></div>}
                {costEst.surcharge > 0 && <div className="flex justify-between text-[12px]"><span className="text-[#666666]">冷链附加费{mode === 'lcl' && costEst.coldChainCount > 0 && costEst.coldChainCount < costEst.orderCount ? `（${costEst.coldChainCount}单）` : ''}</span><span className="text-[#1A1A1A]">¥{(costEst.surcharge / 100).toFixed(2)}</span></div>}
                <div className="flex justify-between text-[12px]"><span className="text-[#666666]">保险费</span><span className="text-[#1A1A1A]">{costEst.orderCount > 1 ? `¥${(costEst.insuranceFee / 100 / costEst.orderCount).toFixed(2)} × ${costEst.orderCount}${unitLabel}` : `¥${(costEst.insuranceFee / 100).toFixed(2)}`}</span></div>
                {(costEst.nightDiscount ?? 0) < 0 && <div className="flex justify-between text-[12px]"><span className="text-[#666666]">夜间 8折</span><span className="text-[#52C41A]">{costEst.orderCount > 1 ? `-¥${(Math.abs(costEst.nightDiscount ?? 0) / 100 / costEst.orderCount).toFixed(2)} × ${costEst.orderCount}${unitLabel}` : `-¥${(Math.abs(costEst.nightDiscount ?? 0) / 100).toFixed(2)}`}</span></div>}
                {/* LTL 独占一车减免：逐车显示 */}
                {mode === 'lcl' && costEst.rebateResult && costEst.rebateResult.fullCarCount > 0 && (() => {
                  const { waybills } = costEst.rebateResult;
                  const fullCarGroups = new Map<number, WaybillRebate[]>();
                  for (const wb of waybills) {
                    if (wb.type === 'full_car_discount') {
                      if (!fullCarGroups.has(wb.carIndex)) fullCarGroups.set(wb.carIndex, []);
                      fullCarGroups.get(wb.carIndex)!.push(wb);
                    }
                  }
                  return Array.from(fullCarGroups.entries()).map(([carIdx, wbs]) => (
                    <div key={`car-${carIdx}`} className="flex justify-between text-[12px]">
                      <span className="text-[#666666]">独占一车减免（第{carIdx}车·{wbs.length}单）</span>
                      <span className="text-[#52C41A]">-¥{(wbs.length * FULL_CAR_DISCOUNT_PER_WAYBILL).toFixed(2)}</span>
                    </div>
                  ));
                })()}
                {mode === 'full' && costEst.discount < 0 && <div className="flex justify-between text-[12px]"><span className="text-[#666666]">{costEst.orderCount > 1 ? '批量优惠' : '平台补贴'}</span><span className="text-[#52C41A]">{costEst.orderCount > 1 ? `-¥${(Math.abs(costEst.discount) / 100 / costEst.orderCount).toFixed(2)} × ${costEst.orderCount}车` : `-¥${(Math.abs(costEst.discount) / 100).toFixed(2)}`}</span></div>}
                <div className="border-t border-[#D6E4FF] pt-2 flex justify-between items-end">
                  <div><span className="text-[13px] font-medium text-[#1A1A1A]">{displayLabel}</span>{!periodInfo && costEst.orderCount > 1 && <span className="text-[11px] text-[#999999] ml-1.5">均 ¥{(costEst.total / costEst.orderCount / 100).toFixed(2)}/单</span>}</div>
                  <span className="text-[16px] font-bold text-[#FF4D4F]">¥{(displayTotal / 100).toFixed(2)}</span>
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

      {/* 底部结算栏 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#EEEEEE] px-4 py-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">{costEst && <div className="flex items-baseline gap-1"><span className="text-[12px] text-[#666666]">{displayLabel}</span><span className="text-[20px] font-bold text-[#FF4D4F]">¥{(displayTotal / 100).toFixed(2)}</span></div>}</div>
          <button onClick={handleSubmit} className="shrink-0 px-8 py-2.5 bg-[#1677FF] text-white rounded-lg text-[14px] font-medium hover:bg-[#4096FF] active:bg-[#0958D9] transition-colors">确认下单</button>
        </div>
        {error && <p className="text-[11px] text-[#FF4D4F] text-center mt-1.5">{error}</p>}
      </div>
    </div>
  </div>
  );
}