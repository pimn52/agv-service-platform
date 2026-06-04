'use client'

import { Smartphone, Cpu, Truck, UserSquare2, ClipboardCheck, CheckCircle2 } from 'lucide-react'

const C = {
  client:   '#1677FF',
  platform: '#2F54EB',
  fleet:    '#52C41A',
  contact:  '#FAAD14',
  handover: '#13C2C2',
  done:     '#9254DE',
}

function Node({
  icon: Icon, title, desc, color, extra,
}: {
  icon: typeof Smartphone; title: string; desc: string; color: string; extra?: React.ReactNode
}) {
  return (
    <div className="relative">
      <div
        className="bg-white rounded-xl border shadow-sm flex items-center gap-2.5"
        style={{ borderColor: `${color}20`, borderLeftWidth: 3, borderLeftColor: `${color}60`, padding: '10px 12px' }}
      >
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}15` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-semibold text-[#1A1A1A]">{title}</span>
          <p className="text-[11px] text-[#999] mt-0.5 leading-snug">{desc}</p>
        </div>
      </div>
      {extra && (
        <div className="absolute left-1/2 -translate-x-1/2 flex justify-center" style={{ bottom: -22 }}>
          {extra}
        </div>
      )}
    </div>
  )
}

function CardBadge({ children, color }: { children: string; color: string }) {
  return (
    <span className="text-[10px] px-2 py-px rounded-full font-medium whitespace-nowrap" style={{ color, backgroundColor: `${color}12` }}>{children}</span>
  )
}

function VLine({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 pl-7 h-6">
      <div className="h-full rounded-full" style={{ width: 2, backgroundColor: '#C0C0C0' }} />
      {label && <span className="text-[10px] text-[#AAA]">{label}</span>}
    </div>
  )
}

function HLine({ label, color = '#C0C0C0' }: { label?: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <div className="rounded-full" style={{ height: 2, width: 5, backgroundColor: color }} />
      {label && <span className="text-[9px] font-medium" style={{ color }}>{label}</span>}
      <div className="rounded-full" style={{ height: 2, width: 5, backgroundColor: color }} />
    </div>
  )
}

function LegendDot({ color, label, sub }: { color: string; label: string; sub: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: `${color}60` }} />
      <span className="text-[11px] text-[#666] whitespace-nowrap">{label}</span>
      <span className="text-[10px] text-[#BBB] whitespace-nowrap ml-auto">{sub}</span>
    </div>
  )
}

export function PlatformArchitecturePage() {
  return (
    <div className="flex flex-col px-3.5 pt-5 pb-5 min-h-full" style={{ backgroundColor: '#F8F9FB' }}>
      {/* ═══ 副标题 ═══ */}
      <p className="text-[13px] text-center mb-8 text-[#1A1A1A]">城市无人车商用运营平台 · 系统架构与数据流</p>

      {/* ═══ 架构流（内部统一 gap-2）═══ */}
      <div className="flex flex-col gap-2">
        <div className="flex items-stretch gap-2">
          <div className="flex-1">
            <Node icon={Smartphone} title="客户端" desc="下单采购 · 实时追踪 · 全局监控" color={C.client}
              extra={<CardBadge color={C.client}>您的角色</CardBadge>} />
          </div>
          <HLine label="下单" color="#1677FF" />
          <div className="flex-1">
            <Node icon={Cpu} title="调度引擎" desc="TMS 调度中枢 · 状态机驱动 · 报价引擎" color={C.platform} />
          </div>
        </div>

        <div className="flex items-stretch h-7">
          <div className="flex-1" />
          <div className="flex-1 flex">
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex-1" style={{ width: 2, backgroundColor: '#C0C0C0', borderRadius: 1 }} />
              <span className="text-[9px] text-[#AAA] py-0.5">通知</span>
              <div className="flex-1" style={{ width: 2, backgroundColor: '#C0C0C0', borderRadius: 1 }} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="flex-1" style={{ width: 2, backgroundColor: '#C0C0C0', borderRadius: 1 }} />
              <span className="text-[9px] text-[#AAA] py-0.5">派单</span>
              <div className="flex-1" style={{ width: 2, backgroundColor: '#C0C0C0', borderRadius: 1 }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Node icon={UserSquare2} title="经停点联系人" desc="短信通知 · Token 授权 · 单站操作" color={C.contact} />
          <Node icon={Truck} title="无人车车队" desc="多款车型 · 格口锁控 · 智能路径" color={C.fleet} />
        </div>

        <div className="flex items-center gap-1.5 pl-8">
          <svg width="18" height="18" viewBox="0 0 18 18" className="shrink-0">
            <path d="M3.5 14.5V8a5.5 5.5 0 0 1 11 0v6.5" fill="none" stroke="#52C41A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="10.5,11.5 14,14.5 14.5,8" fill="none" stroke="#52C41A" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="3.5" cy="14.5" r="1.5" fill="#52C41A" opacity="0.2" stroke="#52C41A" strokeWidth="0.8" />
          </svg>
          <span className="text-[10px] text-[#52C41A] font-medium">实时遥测</span>
          <span className="text-[10px] text-[#AAA]">· GPS · 电量 · 速度 · 格口状态</span>
        </div>

        <VLine label="操作确认" />

        <div className="flex items-stretch gap-2">
          <div className="flex-1">
            <Node icon={ClipboardCheck} title="交接凭证" desc="签收确认 · 异常分级 · 自动生成 POD" color={C.handover} />
          </div>
          <HLine label="完结" color={C.done} />
          <div className="flex-1">
            <Node icon={CheckCircle2} title="订单完结" desc="运费结算 · 电子回单 · 数据归档" color={C.done} />
          </div>
        </div>
      </div>

      {/* ═══ 角色图例 ═══ */}
      <div className="mt-8 rounded-xl py-2.5 px-3" style={{ backgroundColor: '#FFF' }}>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <LegendDot color={C.client}   label="客户 APP"      sub="下单 + 监控全局" />
          <LegendDot color={C.platform} label="平台调度引擎"   sub="调度与数据中枢" />
          <LegendDot color={C.fleet}    label="无人车车队"     sub="执行 + 实时遥测" />
          <LegendDot color={C.contact}  label="经停点联系人"   sub="通知 + 操作确认" />
        </div>
      </div>

      {/* ═══ 演示说明 ═══ */}
      <p className="text-[10px] text-center mt-auto pb-6 text-[#999]">
        演示环境&nbsp;&nbsp;·&nbsp;&nbsp;状态机 / 数据模型 / 报价引擎与生产一致&nbsp;&nbsp;·&nbsp;&nbsp;IoT 接口已预留
      </p>
    </div>
  )
}
