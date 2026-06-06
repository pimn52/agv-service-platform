'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuthStore } from '@/store/use-auth-store'
import { AgvIcon } from '@/components/shared/agv-icon'

function AnimatedNumber({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [value, setValue] = useState(0)
  const ref = useRef<number>(0)

  useEffect(() => {
    ref.current = requestAnimationFrame(() => {
      const duration = 1500
      const start = performance.now()
      const animate = (now: number) => {
        const elapsed = now - start
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
        setValue(Math.round(target * eased))
        if (progress < 1) ref.current = requestAnimationFrame(animate)
      }
      ref.current = requestAnimationFrame(animate)
    })
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [target])

  return <>{value.toLocaleString()}{suffix}</>
}

export function LandingPage() {
  const [entering, setEntering] = useState(false)
  const setDemoMode = useAuthStore((s) => s.setDemoMode)

  const enterDemo = () => {
    if (entering) return
    setEntering(true)
    setDemoMode()
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-gradient-to-b from-[#0A1628] via-[#132742] to-[#1A3A5C] text-white relative overflow-hidden">
      {/* 背景动画：模拟城市灯光 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#1677FF]/10 to-transparent" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-1/4 left-0 right-0 h-px bg-white" style={{ transform: 'rotate(-30deg)' }} />
          <div className="absolute top-2/4 left-0 right-0 h-px bg-white" style={{ transform: 'rotate(-30deg)' }} />
          <div className="absolute top-3/4 left-0 right-0 h-px bg-white" style={{ transform: 'rotate(-30deg)' }} />
        </div>
        <div className="absolute w-1 h-1 bg-[#1677FF] rounded-full top-1/3 left-1/4 animate-pulse" style={{ animationDelay: '0s' }} />
        <div className="absolute w-1 h-1 bg-[#52C41A] rounded-full top-1/2 left-1/2 animate-pulse" style={{ animationDelay: '0.8s' }} />
        <div className="absolute w-1.5 h-1.5 bg-[#FAAD14] rounded-full top-2/3 left-2/3 animate-pulse" style={{ animationDelay: '1.6s' }} />
        <div className="absolute w-1 h-1 bg-[#1677FF] rounded-full top-2/5 left-3/4 animate-pulse" style={{ animationDelay: '2.4s' }} />
      </div>

      <div className="relative z-10 text-center px-6 w-full max-w-sm">
        {/* AGV 图标 */}
        <div className="mb-6 text-[#1677FF]">
          <AgvIcon size={72} />
        </div>

        {/* 个人署名 */}
        <p className="text-[13px] text-white/50 tracking-wider mb-4">
          洪攀 个人演示作品
        </p>

        {/* 产品定位 */}
        <h1 className="text-[22px] font-bold tracking-wide mb-2">
          城市无人车商用运营产品
        </h1>

        {/* 副标题 */}
        <p className="text-[13px] text-white/40 mb-10">
          企业级无人车调度 · 从下单到签收全程可视
        </p>

        {/* 核心数据 */}
        <div className="flex justify-center gap-8 mb-10">
          <div className="text-center">
            <div className="text-[24px] font-bold text-[#1677FF]"><AnimatedNumber target={16000} suffix="+" /></div>
            <div className="text-[11px] text-white/30 mt-1">累计部署 L4 无人车</div>
          </div>
          <div className="text-center">
            <div className="text-[24px] font-bold text-[#52C41A]"><AnimatedNumber target={10000} suffix="W+ km" /></div>
            <div className="text-[11px] text-white/30 mt-1">自动驾驶里程 (km)</div>
          </div>
          <div className="text-center">
            <div className="text-[24px] font-bold text-[#FAAD14]"><AnimatedNumber target={60} suffix="+" /></div>
            <div className="text-[11px] text-white/30 mt-1">覆盖城市</div>
          </div>
        </div>

        {/* 操作按钮 — 给用户明确选择 */}
        <div className="space-y-3">
          <button
            onClick={enterDemo}
            disabled={entering}
            className="w-full py-3 bg-[#1677FF] text-white text-[15px] font-medium rounded-xl
                       hover:bg-[#4096FF] active:bg-[#0958D9] transition-all
                       disabled:opacity-50 shadow-lg shadow-[#1677FF]/25"
          >
            {entering ? '正在进入...' : '演示体验（推荐）'}
          </button>
        </div>
      </div>
    </div>
  )
}
