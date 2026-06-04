'use client';

import type { SubPage } from '@/store';
import type { Order } from '@/types';
import { useOrderStore, useAppStore } from '@/store';
import { FileText, AlertTriangle, CheckCircle2, Truck, BatteryMedium } from 'lucide-react'
import { stopStatus } from '@/components/shared/stop-utils'

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <span className="text-[#666666] shrink-0">{label}</span>
      <span className="ml-auto text-[#1A1A1A] text-right">{value}</span>
    </div>
  )
}

import { STATUS_LABELS } from '@/constants/status-labels'

const SERVICE_TYPE_MAP: Record<string, string> = {
  logistics: '物流配送',
  vending: '巡游贩卖',
  security: '安防巡检',
};

export function OrderDetailPage({ page }: { page: SubPage }) {
  const { orders } = useOrderStore();
  const { pushPage } = useAppStore();
  const pageData = (page as { key: string; data?: { orderId?: string } }).data;
  const orderId = pageData?.orderId ?? '';
  const order = orders.find((o: Order) => o.id === orderId);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#F5F6FA]">
        <p className="text-[14px] text-[#999999]">订单不存在</p>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[order.status] || { label: order.status, color: '#999999' };

  return (
    <div className="flex flex-col h-full bg-[#F5F6FA]">
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-20">
        {/* 订单状态 */}
        <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] text-[#666666]">订单状态</span>
            <span className="text-[13px] font-medium" style={{ color: statusInfo.color }}>
              {statusInfo.label}
            </span>
          </div>
          <div className="text-[11px] text-[#999999]">订单号：{order.id}</div>
        </div>

        {/* 车辆信息（仅无 ftlWaybills 时显示，ftlWaybills 由下方运单卡片承载） */}
        {order.vehicleName && !order.ftlWaybills?.length && (
          <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
            <p className="text-[13px] font-medium text-[#1A1A1A] mb-2">车辆信息</p>
            <InfoRow label="车辆" value={`${order.vehicleName} · ${order.vehiclePlate}`} />
            {order.vehicleBattery !== undefined && order.status !== 'completed' && (
              <div className="mt-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#999999]">电量</span>
                  <div className="flex-1 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                    <div className="h-full bg-[#1677FF] rounded-full transition-all" style={{ width: `${order.vehicleBattery}%` }} />
                  </div>
                  <span className="text-[11px] text-[#666666]">{order.vehicleBattery}%</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 整车配送 — 运单卡片（新：ftlWaybills） */}
        {order.deliveryMode === 'full_load' && order.ftlWaybills && order.ftlWaybills.length > 0 && (
          <div className="mx-4 mt-3 space-y-2">
            {order.ftlWaybills.map((wb, wi) => {
              const wbStatus = wb.status || 'in_progress';
              const statusColor: Record<string, string> = {
                created: '#999999', assigned: '#FAAD14', in_progress: '#1677FF', completed: '#52C41A', exception: '#FF4D4F',
              };
              const statusLabel: Record<string, string> = {
                created: '待分配', assigned: '已指派', in_progress: '进行中', completed: '已完成', exception: '异常',
              };
              return (
                <div key={wb.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* 运单头部：车型 + 车牌 + 状态 */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#F5F6FA]">
                    <Truck className="w-3.5 h-3.5 text-[#1677FF]" />
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">
                      {wb.vehicleModelName || wb.vehicleModelId || '--'}
                      {wb.vehiclePlate ? ` · ${wb.vehiclePlate}` : ''}
                    </span>
                    {wb.vehicleBattery !== undefined && wbStatus !== 'completed' && (
                      <span className="text-[10px] text-[#999999] flex items-center gap-0.5 ml-auto mr-2">
                        <BatteryMedium className="w-3 h-3" />
                        {wb.vehicleBattery}%
                      </span>
                    )}
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: statusColor[wbStatus], backgroundColor: statusColor[wbStatus] + '15' }}>
                      {statusLabel[wbStatus] || wbStatus}
                    </span>
                  </div>
                  {/* 经停点列表 */}
                  {wb.stops.map((s, idx) => {
                    const isPickup = s.type === 'pickup';
                    const iconLabel = isPickup ? '发' : '收';
                    const iconBg = isPickup ? 'bg-[#E6F0FF]' : 'bg-[#F6FFED]';
                    const iconColor = isPickup ? 'text-[#1677FF]' : 'text-[#52C41A]';
                    const ss = stopStatus(s);
                    const statusBadge: Record<string, { label: string; color: string }> = {
                      pending: { label: '待到达', color: '#999999' },
                      arrived: { label: '已到达', color: '#1677FF' },
                      in_progress: { label: isPickup ? '装货中' : '卸货中', color: '#FAAD14' },
                      completed: { label: '已完成', color: '#52C41A' },
                      skipped: { label: '已跳过', color: '#FAAD14' },
                      exception: { label: '异常', color: '#FF4D4F' },
                    };
                    const badge = statusBadge[ss] || statusBadge.pending;
                    return (
                      <div key={s.id} className="border-b border-[#F5F6FA] last:border-b-0">
                        <div className="flex items-start gap-3 px-4 py-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${iconBg} shadow-sm`}>
                            <span className={`text-[13px] font-bold ${iconColor}`}>{iconLabel}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] text-[#1A1A1A]">{s.address}</p>
                            <p className="text-[11px] text-[#999999] mt-0.5">{s.contactName} · {s.contactPhone}</p>
                            {s.cargoDescription && <p className="text-[11px] text-[#666666] mt-0.5">{s.cargoDescription}{s.cargoWeight ? ` · ${s.cargoWeight}kg` : ''}</p>}
                            {s.timeWindow && <span className="inline-block mt-1 text-[10px] text-[#1677FF] bg-[#E6F0FF] px-1.5 py-0.5 rounded">{s.timeWindow}</span>}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-[10px] text-[#CCCCCC]">#{idx + 1}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: badge.color, backgroundColor: badge.color + '15' }}>{badge.label}</span>
                          </div>
                        </div>
                        {/* 交接记录 */}
                        {s.handoverRecords && s.handoverRecords.length > 0 && (
                          <div className="px-4 pb-2 ml-10 space-y-0.5">
                            {s.handoverRecords.map((r) => {
                              const isAnomaly = !!r.anomalyNote;
                              return (
                                <div key={r.id} className="flex items-center gap-1.5 text-[10px]">
                                  {isAnomaly ? <AlertTriangle className="w-2.5 h-2.5 text-[#FF4D4F] shrink-0" /> : <CheckCircle2 className="w-2.5 h-2.5 text-[#52C41A] shrink-0" />}
                                  <span className="text-[#666666]">{new Date(r.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                                  <span className="text-[#999999]">{r.operatorName}</span>
                                  <span className={isAnomaly ? 'text-[#FF4D4F]' : 'text-[#52C41A]'}>{isAnomaly ? '异常' : '正常'}{r.type === 'pickup' ? '装货' : '卸货'}</span>
                                  {isAnomaly && <span className="text-[#FF4D4F] truncate max-w-[100px]">{r.anomalyNote}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* 散件直送 — 运单卡片（1订N单视图） */}
        {order.deliveryMode === 'ltl' && order.ltlWaybills && order.ltlWaybills.length > 0 && (
          <div className="mx-4 mt-3 space-y-2">
            {order.compartments && (
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[11px] text-[#999999]">格口分配：</span>
                {order.compartments.map((c) => (
                  <span key={c.id} className="text-[10px] bg-[#F5F6FA] text-[#666666] px-1.5 py-0.5 rounded">{c.label} {c.capacityKg}kg</span>
                ))}
              </div>
            )}
            {order.ltlWaybills.map((wb) => {
              const comp = order.compartments?.find((c) => c.id === wb.compartmentId);
              const statusText: Record<string, string> = {
                created: '待分配', assigned: '待投件', loaded: '已投件',
                in_transit: '运输中', arrived: '已到达', completed: '已完成', exception: '异常',
              };
              const statusColor: Record<string, string> = {
                created: '#999999', assigned: '#FAAD14', loaded: '#1677FF',
                in_transit: '#1677FF', arrived: '#52C41A', completed: '#52C41A', exception: '#FF4D4F',
              };
              const wbStatus = wb.status || 'created';
              return (
                <div key={wb.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  {/* 运单头部 */}
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#F5F6FA]">
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">{wb.id}</span>
                    {comp && <span className="text-[11px] bg-[#E6F0FF] text-[#1677FF] px-1.5 py-0.5 rounded font-medium">{comp.label}</span>}
                    <span className="text-[11px] font-medium ml-auto" style={{ color: statusColor[wbStatus] }}>
                      {statusText[wbStatus] || wbStatus}
                    </span>
                  </div>
                  {/* 运单内容 */}
                  <div className="px-4 py-2.5 space-y-1.5">
                    <div className="flex items-center gap-1 text-[12px]">
                      <span className="text-[#1677FF] font-medium">{wb.pickupAddress || '--'}</span>
                      <span className="text-[#CCCCCC]">→</span>
                      <span className="text-[#52C41A] font-medium">{wb.deliveryAddress || '--'}</span>
                    </div>
                    {(wb.pickupCode || wb.deliveryCode) && (
                      <div className="flex gap-3 text-[11px]">
                        {wb.pickupCode && <span className="text-[#666666]">投件码 <span className="text-[#1A1A1A] font-mono font-medium">{wb.pickupCode}</span></span>}
                        {wb.deliveryCode && <span className="text-[#666666]">取件码 <span className="text-[#1A1A1A] font-mono font-medium">{wb.deliveryCode}</span></span>}
                      </div>
                    )}
                    {wb.cargoItems && wb.cargoItems.length > 0 && (
                      <div className="text-[11px] text-[#999999]">
                        {wb.cargoItems.map((ci, i) => (
                          <span key={i}>{ci.name} {ci.quantity}件/{ci.weight}kg{i < wb.cargoItems!.length - 1 ? ' · ' : ''}</span>
                        ))}
                      </div>
                    )}
                    {wb.handoverRecords && wb.handoverRecords.length > 0 && (
                      <div className="space-y-0.5">
                        {wb.handoverRecords.map((hr) => {
                          const isAnomaly = !!hr.anomalyNote;
                          return (
                            <div key={hr.id} className="flex items-center gap-1.5 text-[10px]">
                              {isAnomaly ? <AlertTriangle className="w-2.5 h-2.5 text-[#FF4D4F] shrink-0" /> : <CheckCircle2 className="w-2.5 h-2.5 text-[#52C41A] shrink-0" />}
                              <span className="text-[#666666]">{new Date(hr.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-[#999999]">{hr.operatorName}</span>
                              <span className={isAnomaly ? 'text-[#FF4D4F]' : 'text-[#52C41A]'}>{isAnomaly ? '异常' : '正常'}{hr.type === 'pickup' ? '投件' : '取件'}</span>
                              {isAnomaly && <span className="text-[#FF4D4F] truncate max-w-[100px]">{hr.anomalyNote}</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 服务信息（无 ftlWaybills/ltlWaybills 时 fallback 旧字段） */}
        {(!order.ftlWaybills || order.ftlWaybills.length === 0) && (!order.ltlWaybills || order.ltlWaybills.length === 0) && (
          <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
            <p className="text-[13px] font-medium text-[#1A1A1A] mb-3">服务信息</p>
            <div className="space-y-3">
              <InfoRow label="服务类型" value={SERVICE_TYPE_MAP[order.serviceType] || order.serviceType} />
              {order.deliveryMode && <InfoRow label="配送模式" value={order.deliveryMode === 'full_load' ? '整车配送' : '散件直送'} />}
              {order.senderName && <InfoRow label="发货人" value={`${order.senderName} · ${order.senderPhone || ''}`} />}
              {order.senderAddress && <InfoRow label="发货地址" value={typeof order.senderAddress === 'string' ? order.senderAddress : order.senderAddress.address} />}
              {order.receiverName && <InfoRow label="收货人" value={`${order.receiverName} · ${order.receiverPhone || ''}`} />}
              {order.receiverAddress && <InfoRow label="收货地址" value={typeof order.receiverAddress === 'string' ? order.receiverAddress : order.receiverAddress.address} />}
              {order.cargoInfo && <InfoRow label="货物" value={`${order.cargoInfo}${order.cargoWeight ? ` (${order.cargoWeight}kg)` : ''}`} />}
              {order.pickupLocation && <InfoRow label="取车地点" value={order.pickupLocation} />}
              {order.duration && <InfoRow label="租赁时长" value={`${order.duration}小时`} />}
              {order.packageName && <InfoRow label="配套套餐" value={order.packageName} />}
            </div>
          </div>
        )}

        {/* 费用信息 */}
        <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
          <p className="text-[13px] font-medium text-[#1A1A1A] mb-3">费用信息</p>
          <div className="flex justify-between text-[12px]">
            <span className="text-[#666666]">订单金额</span>
            <span className="text-[#1A1A1A] font-medium">¥{((order.estimatedCost ?? 0) / 100).toFixed(2)}</span>
          </div>
          {order.actualCost !== undefined && order.actualCost > 0 && (
            <div className="flex justify-between text-[12px] mt-2">
              <span className="text-[#666666]">实际费用</span>
              <span className="text-[#FF4D4F] font-medium">¥{(order.actualCost / 100).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* 开票 */}
        {(order.status === 'completed') && (
          <div className="mx-4 mt-3 bg-white rounded-xl p-4 shadow-sm">
            <button
              onClick={() => pushPage({ key: 'invoice', data: { orderId: order.id } })}
              className="flex items-center gap-2 w-full text-left"
            >
              <FileText className="w-4 h-4 text-[#1677FF]" />
              <span className="text-[13px] text-[#1A1A1A]">申请开票</span>
              <span className="ml-auto text-[#CCCCCC]">&gt;</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
