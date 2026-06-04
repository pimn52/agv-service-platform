import type { Order, LTLWaybill, SpecialRequirement } from '@/types';
import { getCompatibleModels } from '@/lib/ltl-car-groups';

/** 车型 ID → 格口数映射（来源：memory/vehicle-specs.md，唯一权威） */
export const VEHICLE_COMPARTMENT_COUNT: Record<string, number> = {
  lm_z2: 3,
  lm_x3: 3,
  lm_z5: 4,
  lm_e6: 1,
  lm_x6: 5,
};

export const REBATE_PER_WAYBILL = 2;          // 拼车返利（元/运单），下单后匹配
export const FULL_CAR_DISCOUNT_PER_WAYBILL = 4; // 独占一车减免（元/运单），下单前减免

export interface WaybillRebate {
  waybillId?: string
  waybillIndex: number   // waybill 在原数组中的序号
  type: 'full_car_discount' | 'carpool_rebate'
  amount: number         // 该运单的折扣金额（元）
  carIndex: number       // 所属车辆序号（从 1 开始）
  modelId: string
  compartmentCount: number
}

export interface RebateResult {
  waybills: WaybillRebate[]     // 每条运单的折扣明细
  fullCarCount: number          // 满车辆数
  partialWbCount: number        // 不满车运单数
  fullCarDiscountTotal: number  // 独占减免总额（元）
  carpoolRebateTotal: number    // 拼车返利总额（元，仅支付后使用）
}

/**
 * 根据运单的特殊要求确定分配的车型。
 * 无特殊要求默认 lm_z2（最小灵活）；有特殊要求取兼容车型中格口数最小的。
 */
export function getAssignedVehicleModel(ltlWaybills: LTLWaybill[]): string {
  const allReqs = new Set<SpecialRequirement>();
  for (const wb of ltlWaybills) {
    for (const r of (wb.specialRequirements || [])) {
      allReqs.add(r);
    }
  }
  if (allReqs.size === 0) return 'lm_z2';
  const compatibleModels = getCompatibleModels([...allReqs]);
  if (compatibleModels.length === 0) return 'lm_z2'; // 兜底
  // 按格口数升序，选最小的可用车型（避免浪费运力）
  return compatibleModels.sort(
    (a, b) => (VEHICLE_COMPARTMENT_COUNT[a] ?? 99) - (VEHICLE_COMPARTMENT_COUNT[b] ?? 99),
  )[0];
}

/**
 * 计算散件直送的返利/折扣。
 *
 * 核心规则：
 * - FTL（整车配送）不存在拼车/独占概念 → 直接返回 null
 * - 运单数 < 2 → null（无反利条件）
 * - 不同投件地址 → null（无法拼车）
 * - 特殊要求互斥（无兼容车型交集）→ null
 *
 * 按车分包，逐车判定满/不满：
 * - 满车（运单数 = 格口数）→ ¥4/运单 独占一车减免，下单前抵扣
 * - 不满车（运单数 < 格口数）→ ¥2/运单 拼车返利，下单前不展示
 */
export function computeRebate(order: Order): RebateResult | null {
  // FTL 不存在拼车/独占概念
  if (order.serviceType !== 'logistics' || order.deliveryMode !== 'ltl') return null;
  const ltlWaybills = order.ltlWaybills;
  if (!ltlWaybills || ltlWaybills.length < 2) return null;

  // 按投件地址分组，每组独立计算（3单到A + 1单到B → A的3单可拼车）
  const addressGroups = new Map<string, LTLWaybill[]>();
  for (const wb of ltlWaybills) {
    const addr = wb.pickupAddress || '';
    if (!addr) continue;
    if (!addressGroups.has(addr)) addressGroups.set(addr, []);
    addressGroups.get(addr)!.push(wb);
  }

  // 没有任何组 ≥2 运单则无法拼车
  const hasValidGroup = [...addressGroups.values()].some((g) => g.length >= 2);
  if (!hasValidGroup) return null;

  const waybills: WaybillRebate[] = [];
  let carIndex = 0;
  let fullCarCount = 0;
  let partialWbCount = 0;
  let fullCarDiscountTotal = 0;
  let carpoolRebateTotal = 0;

  for (const [, group] of addressGroups) {
    if (group.length < 2) continue; // 单运单组不产生任何折扣/返利

    // 组内特殊要求兼容性检查
    const groupReqs = new Set<SpecialRequirement>();
    for (const wb of group) {
      for (const r of (wb.specialRequirements || [])) {
        groupReqs.add(r);
      }
    }
    if (groupReqs.size > 0) {
      const compatibleModels = getCompatibleModels([...groupReqs]);
      if (compatibleModels.length === 0) continue; // 该组无兼容车型，跳过
    }

    const modelId = getAssignedVehicleModel(group);
    const compartmentCount = VEHICLE_COMPARTMENT_COUNT[modelId] ?? 3;

    // 按车分包，逐车判定满/不满
    for (let i = 0; i < group.length; i += compartmentCount) {
      carIndex++;
      const carWaybills = group.slice(i, i + compartmentCount);
      const isFull = carWaybills.length === compartmentCount;

      for (let j = 0; j < carWaybills.length; j++) {
        const wb = carWaybills[j];
        const waybillIndex = ltlWaybills.indexOf(wb);
        if (isFull) {
          waybills.push({
            waybillId: wb.id,
            waybillIndex,
            type: 'full_car_discount',
            amount: FULL_CAR_DISCOUNT_PER_WAYBILL,
            carIndex,
            modelId,
            compartmentCount,
          });
          fullCarDiscountTotal += FULL_CAR_DISCOUNT_PER_WAYBILL;
        } else {
          waybills.push({
            waybillId: wb.id,
            waybillIndex,
            type: 'carpool_rebate',
            amount: REBATE_PER_WAYBILL,
            carIndex,
            modelId,
            compartmentCount,
          });
          carpoolRebateTotal += REBATE_PER_WAYBILL;
          partialWbCount++;
        }
      }
      if (isFull) fullCarCount++;
    }
  }

  if (waybills.length === 0) return null;

  return {
    waybills,
    fullCarCount,
    partialWbCount,
    fullCarDiscountTotal,
    carpoolRebateTotal,
  };
}
