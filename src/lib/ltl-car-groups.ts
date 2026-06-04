import type { LTLWaybill, Compartment, FTLWaybill, Order, SpecialRequirement } from '@/types'

/** 车型 ID → 展示名映射 */
export const VEHICLE_MODEL_NAME: Record<string, string> = {
  lm_z2: 'Z2 小型配送车',
  lm_x3: 'X3 城配',
  lm_z5: 'Z5 中型配送车',
  lm_e6: 'E6 散件配送车',
  lm_x6: 'X6 重载',
};

/** 根据 modelId 获取展示名，未知则返回 modelId 本身 */
export function getVehicleModelName(modelId: string): string {
  return VEHICLE_MODEL_NAME[modelId] || modelId;
}

/** 特殊要求 → 兼容车型 ID 列表 */
const SPECIAL_REQ_COMPATIBLE_MODELS: Record<SpecialRequirement, string[]> = {
  cold_chain: ['lm_z5', 'lm_x6'],    // Z5 选配冷藏、X6 标配+选配冷藏
  oversized: ['lm_x6'],               // 仅 X6 支持超大件
  fragile: ['lm_z2', 'lm_x3', 'lm_z5', 'lm_e6', 'lm_x6'], // 全部支持
};

/** 根据一组特殊要求，计算所有兼容的车型 ID 交集 */
export function getCompatibleModels(requirements: SpecialRequirement[]): string[] {
  if (!requirements.length) return ['lm_z2', 'lm_x3', 'lm_z5', 'lm_e6', 'lm_x6'];
  const sets = requirements.map(r => new Set(SPECIAL_REQ_COMPATIBLE_MODELS[r]));
  const intersection = sets.reduce((acc, s) => new Set([...acc].filter(x => s.has(x))), sets[0]);
  return [...intersection];
}

/** LTL 散件拼车：按取件地址分组 → 同地址按格口数分包 */
export interface LTLCarGroup {
  carIndex: number
  waybillIndices: number[]
  pickupAddress: string
}

export function computeLTLCarGroups(
  ltlWaybills: LTLWaybill[],
  compartmentsPerCar = 3,
): LTLCarGroup[] {
  // 1. 按取件地址分组
  const addressGroups = new Map<string, number[]>()
  ltlWaybills.forEach((wb, i) => {
    const addr = wb.pickupAddress || '(未填写)'
    if (!addressGroups.has(addr)) addressGroups.set(addr, [])
    addressGroups.get(addr)!.push(i)
  })

  // 2. 每组内按格口数分包（同地址超格口需多车）
  const cars: LTLCarGroup[] = []
  let ci = 0
  for (const [addr, indices] of addressGroups) {
    for (let i = 0; i < indices.length; i += compartmentsPerCar) {
      cars.push({ carIndex: ci++, waybillIndices: indices.slice(i, i + compartmentsPerCar), pickupAddress: addr })
    }
  }
  return cars
}

/** 根据 LTL 拼车分组生成 compartments + 分配 compartmentId 到各运单。
 *  每辆车绑定唯一车牌号（京A·ULxx），compartments 的 vehicleId 存车牌。 */
export function buildLTLCompartments(
  ltlWaybills: LTLWaybill[],
  carGroups: LTLCarGroup[],
): { compartments: Compartment[]; assignedWaybills: LTLWaybill[]; vehiclePlates: string[]; vehicleModels: { plate: string; modelId: string }[] } {
  const compartments: Compartment[] = []
  const assigned = ltlWaybills.map((wb) => ({ ...wb, status: 'assigned' as const }))
  const vehiclePlates: string[] = []
  const vehicleModels: { plate: string; modelId: string }[] = []

  const COMPARTMENT_LABELS = ['A舱', 'B舱', 'C舱', 'D舱', 'E舱']

  carGroups.forEach((car) => {
    const plateNum = (car.carIndex + 1).toString().padStart(3, '0')
    const plate = `京A·L${plateNum}`
    vehiclePlates.push(plate)

    // 根据该车组运单的特殊要求选择兼容车型
    const groupReqs = new Set<SpecialRequirement>();
    for (const wbIdx of car.waybillIndices) {
      for (const r of (ltlWaybills[wbIdx]?.specialRequirements || [])) {
        groupReqs.add(r);
      }
    }
    const compatibleModels = getCompatibleModels([...groupReqs]);
    if (compatibleModels.length === 0) {
      console.warn(`[LTL派车] 车组${car.carIndex}无兼容车型，fallback到全部车型`);
    }
    const modelId = compatibleModels[0] || 'lm_z2';
    // 车型锁验证日志：当特殊要求限制了车型范围时输出
    if (groupReqs.size > 0) {
      console.log(`[LTL车型锁] 车组${car.carIndex} 特殊要求:[${[...groupReqs].join(',')}] → 兼容车型:[${compatibleModels.join(',')}] → 选中:${modelId} 车牌:${plate}`);
    }
    vehicleModels.push({ plate, modelId });

    car.waybillIndices.forEach((wbIdx, compIdx) => {
      const compId = `COMP-${plateNum}-${String.fromCharCode(65 + compIdx)}`
      compartments.push({
        id: compId,
        vehicleId: plate,  // 用车牌号作为 vehicleId
        label: COMPARTMENT_LABELS[compIdx] || `${compIdx + 1}舱`,
        capacityKg: 100,
        capacityVolume: 200,
      })
      assigned[wbIdx].compartmentId = compId
    })
  })

  return { compartments, assignedWaybills: assigned, vehiclePlates, vehicleModels }
}

/** 获取某辆车上的运单数 */
export function getLTLWaybillCountForVehicle(
  ltlWaybills: LTLWaybill[],
  compartments: Compartment[],
  plate: string,
): number {
  return ltlWaybills.filter((wb) => {
    const comp = compartments.find((c) => c.id === wb.compartmentId)
    return comp?.vehicleId === plate
  }).length
}

/** FTL：判断是否需要显示 "N/M车" 前缀 */
export function getFTLCarPrefix(ftlWaybills: FTLWaybill[], waybillId: string): string {
  if (!ftlWaybills?.length || ftlWaybills.length <= 1) return ''
  const wi = ftlWaybills.findIndex((w) => w.id === waybillId)
  return wi >= 0 ? `${wi + 1}/${ftlWaybills.length}车 · ` : ''
}

/**
 * 获取 LTL 订单的有效 compartments。
 * 首选已存 compartments；缺失时从 waybills 动态重建（容错复原）。
 * 确保任何显示层不会因数据残缺而塌缩。
 */
export function ensureLTLCompartments(order: Order): Compartment[] {
  if (order.deliveryMode !== 'ltl') return []
  if (order.compartments?.length) return order.compartments
  if (!order.ltlWaybills?.length) return []
  const groups = computeLTLCarGroups(order.ltlWaybills)
  return buildLTLCompartments(order.ltlWaybills, groups).compartments
}
