import type { Vehicle } from '@/types'
import { MOCK_VEHICLES } from '@/mock/data'

/** 同步查找（演示模式渲染用，不发起网络请求） */
export function findVehicleById(id: string): Vehicle | undefined {
  return MOCK_VEHICLES.find((v) => v.id === id)
}

/** 按 ID 查询车辆（异步，后续接入 Supabase vehicles 表） */
export async function getVehicleById(id: string): Promise<Vehicle | undefined> {
  return MOCK_VEHICLES.find((v) => v.id === id)
}

/** 按服务类型查询车辆 */
export async function getVehiclesByType(type: Vehicle['type']): Promise<Vehicle[]> {
  return MOCK_VEHICLES.filter((v) => v.type === type)
}
