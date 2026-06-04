import {
  LOGISTICS_VEHICLE_MODELS,
  VENDING_VEHICLE_MODELS,
  SECURITY_VEHICLE_MODELS,
} from '@/constants/services';

const SHORT_NAMES: Record<string, string> = {
  lm_z2: 'Z2小型', lm_x3: 'X3城配', lm_z5: 'Z5中型', lm_e6: 'E6散件', lm_x6: 'X6重载',
  vm_std: '标准贩卖', vm_smart: '智能零售', vm_drink: '饮品专车',
  sm_basic: '基础巡检', sm_std: '标准巡检', sm_adv: '移动哨兵',
};

export function getShortName(id: string, fallback: string): string {
  return SHORT_NAMES[id] ?? fallback.slice(0, 4);
}

export interface ShowcaseVehicleData {
  id: string;
  name: string;
  shortName: string;
  imageUrl: string;
  specLines: string[];
  serviceType: 'logistics' | 'vending' | 'security';
  coverageArea?: number;
  startingPrice?: string;
}

export function getLogisticsShowcaseVehicles(): ShowcaseVehicleData[] {
  return LOGISTICS_VEHICLE_MODELS.map((v) => ({
    id: v.id,
    name: v.name,
    shortName: getShortName(v.id, v.name),
    imageUrl: v.imageUrl,
    specLines: [
      `载重${v.loadCapacity}kg · 容积${v.cargoVolume}m³`,
      `续航${v.range}km · 极速${v.maxSpeed}km/h`,
    ],
    serviceType: 'logistics' as const,
  }));
}

export function getVendingShowcaseVehicles(): ShowcaseVehicleData[] {
  return VENDING_VEHICLE_MODELS.map((v) => ({
    id: v.id,
    name: v.name,
    shortName: getShortName(v.id, v.name),
    imageUrl: v.imageUrl,
    specLines: [v.description],
    serviceType: 'vending' as const,
  }));
}

export function getSecurityShowcaseVehicles(): ShowcaseVehicleData[] {
  return SECURITY_VEHICLE_MODELS.map((v) => ({
    id: v.id,
    name: v.name,
    shortName: getShortName(v.id, v.name),
    imageUrl: v.imageUrl,
    specLines: [`覆盖${v.patrolRange}km · ${v.description}`],
    serviceType: 'security' as const,
    coverageArea: v.patrolRange * 1000, // 粗略换算为 m² 展示
  }));
}
