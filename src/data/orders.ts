import type { Order, OrderStatus, ServiceType, PaymentMethod, CargoType, SpecialRequirement } from '@/types'
import { MOCK_ORDERS } from '@/mock/data'
import { createClient } from '@/lib/supabase/client'
import { buildOrder } from '@/lib/order-factory'
import type { OrderSpec } from '@/lib/order-factory'
import { computeLTLCarGroups, buildLTLCompartments, getVehicleModelName } from '@/lib/ltl-car-groups'

function isDemoUser(userId: string): boolean {
  return userId === 'demo_user'
}

/** DB 行格式 → 前端 Order 类型。优先从 detail JSONB 读取完整数据 */
function mapOrderRow(row: Record<string, unknown>): Order {
  // 优先 JSONB detail 列 — 用 Supabase row.id 覆盖 detail 中的工厂 ID
  const detail = row.detail as Record<string, unknown> | undefined
  if (detail && typeof detail === 'object' && detail.id) {
    const order = detail as unknown as Order
    return { ...order, id: row.id as string, status: (row.status as OrderStatus) ?? order.status }
  }

  // 兼容旧 flat 字段
  const logistics = (row.order_logistics as Record<string, unknown>[]) ?? []
  const l = (logistics[0] ?? {}) as Record<string, unknown>
  return {
    id: row.id as string,
    serviceType: (row.service_type as ServiceType) ?? 'logistics',
    status: (row.status as OrderStatus) ?? 'pending',
    amount: (row.amount as number) ?? 0,
    paymentMethod: (row.payment_method as PaymentMethod | undefined) ?? undefined,
    estimatedTime: row.estimated_time as number | undefined,
    vehicleId: (l.vehicle_id as string) ?? '',
    vehicleName: (l.vehicle_name as string) ?? '',
    vehicleModel: (l.vehicle_model as string) ?? '',
    vehicleImage: '/vehicle-delivery.png',
    vehiclePlate: (l.vehicle_plate as string) ?? '',
    senderName: l.sender_name as string | undefined,
    senderPhone: l.sender_phone as string | undefined,
    senderAddress: (l.sender_address as string | undefined) ?? undefined,
    receiverName: l.receiver_name as string | undefined,
    receiverPhone: l.receiver_phone as string | undefined,
    receiverAddress: (l.receiver_address as string | undefined) ?? undefined,
    cargoInfo: l.cargo_info as string | undefined,
    cargoType: (l.cargo_type as CargoType) ?? undefined,
    cargoWeight: l.cargo_weight as number | undefined,
    specialRequirements: (l.special_requirements as SpecialRequirement[]) ?? undefined,
    origin: (l.origin as { lat: number; lng: number; address: string }) ?? undefined,
    destination: (l.destination as { lat: number; lng: number; address: string }) ?? undefined,
    estimatedCost: (l.estimated_cost as number) ?? undefined,
    actualCost: (l.actual_cost as number) ?? undefined,
    deliveryMode: (l.delivery_mode as 'full_load' | 'ltl') ?? undefined,
    deliveryTime: l.delivery_time as string | undefined,
    remainingDistance: l.remaining_distance as number | undefined,
    remainingTime: l.remaining_time as number | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    completedAt: (row.completed_at as string) ?? undefined,
  }
}

/** 查询用户的所有订单。演示订单作为基础体验数据，用户自有订单混排在上方 */
export async function getOrders(userId: string): Promise<Order[]> {
  // 真实用户白板账号，不注入演示数据；演示用户加载全部演示订单
  const baseOrders = isDemoUser(userId) ? MOCK_ORDERS : []

  const supabase = createClient()
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const ownOrders = (data || [])
    .map((row) => mapOrderRow(row as unknown as Record<string, unknown>))
    .filter((o): o is Order => o !== null)

  // 去重：自有订单已含在 MOCK_ORDERS 中则跳过
  const ownIds = new Set(ownOrders.map((o) => o.id))
  const filteredBase = baseOrders.filter((o) => !ownIds.has(o.id))

  return [...ownOrders, ...filteredBase]
}

/** 创建订单。工厂构建 + 格口分配逻辑共享，仅持久化层区分 demo/真实用户。 */
export async function createOrder(userId: string, data: Partial<Order>): Promise<Order | null> {
  const now = new Date().toISOString()

  const spec: OrderSpec = {
    serviceType: data.serviceType ?? 'logistics',
    deliveryMode: data.deliveryMode,
    cruiseType: data.cruiseType,
    status: 'pending',
    vehicleId: data.vehicleId,
    vehicleModel: data.vehicleModel,
    vehicleName: data.vehicleName,
    vehiclePlate: data.vehiclePlate,
    vehicleBattery: data.vehicleBattery,
    vehicleCount: data.vehicleCount,
    ftlWaybills: data.ftlWaybills,
    stops: data.stops,
    ltlWaybills: data.ltlWaybills,
    compartments: data.compartments,
    origin: data.origin,
    destination: data.destination,
    senderName: data.senderName,
    senderPhone: data.senderPhone,
    senderAddress: typeof data.senderAddress === 'string' ? data.senderAddress : data.senderAddress?.address,
    receiverName: data.receiverName,
    receiverPhone: data.receiverPhone,
    receiverAddress: typeof data.receiverAddress === 'string' ? data.receiverAddress : data.receiverAddress?.address,
    cargoInfo: data.cargoInfo,
    cargoType: data.cargoType,
    cargoWeight: data.cargoWeight,
    specialRequirements: data.specialRequirements,
    deliveryTime: data.deliveryTime,
    estimatedTime: data.estimatedTime,
    estimatedCost: data.estimatedCost,
    amount: data.amount ?? data.estimatedCost ?? 0,
    paymentMethod: data.paymentMethod,
    duration: data.duration,
    pickupLocation: data.pickupLocation,
    pickupContact: data.pickupContact,
    pickupPhone: data.pickupPhone,
    equipmentPackageId: data.equipmentPackageId,
    packageName: data.packageName,
    rentalPlan: data.rentalPlan,
    routePlanId: data.routePlanId,
  }
  const fullOrder = buildOrder(spec)

  // ── 共享：散件拼车格口分配 ──
  if (fullOrder.deliveryMode === 'ltl' && fullOrder.ltlWaybills?.length) {
    const groups = computeLTLCarGroups(fullOrder.ltlWaybills)
    const result = buildLTLCompartments(fullOrder.ltlWaybills, groups)
    fullOrder.compartments = result.compartments
    fullOrder.ltlWaybills = result.assignedWaybills
    fullOrder.vehiclePlate = result.vehiclePlates[0] || fullOrder.vehiclePlate
    if (result.vehicleModels.length > 0) {
      fullOrder.vehicleModelId = result.vehicleModels[0].modelId
      fullOrder.vehicleModel = getVehicleModelName(result.vehicleModels[0].modelId)
    }
  }
  // ── 共享：整车配送车牌分配 ──
  if (fullOrder.deliveryMode === 'full_load' && fullOrder.ftlWaybills?.length) {
    fullOrder.ftlWaybills = fullOrder.ftlWaybills.map((wb, i) => ({
      ...wb,
      vehiclePlate: wb.vehiclePlate || `京A·UV${String(i + 1).padStart(3, '0')}`,
    }))
    if (!fullOrder.vehiclePlate) {
      fullOrder.vehiclePlate = fullOrder.ftlWaybills[0].vehiclePlate || ''
    }
  }

  // ── 持久化分支：仅此处不同 ──
  if (isDemoUser(userId)) {
    fullOrder.id = `DEMO-${Date.now()}`
    return fullOrder
  }

  const supabase = createClient()
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      user_id: userId,
      service_type: data.serviceType ?? 'logistics',
      status: 'pending',
      amount: data.amount ?? data.estimatedCost ?? 0,
      estimated_time: data.estimatedTime,
      detail: fullOrder,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single()

  if (error || !order) return null

  // 同步 Supabase UUID 到 detail JSONB，保证 mapOrderRow 读取时 ID 一致
  const supabaseId = order.id as string
  fullOrder.id = supabaseId
  await supabase
    .from('orders')
    .update({ detail: fullOrder, updated_at: now })
    .eq('id', supabaseId)

  return fullOrder
}
