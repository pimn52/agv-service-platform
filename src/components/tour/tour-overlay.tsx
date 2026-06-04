'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'

interface TourStep {
  targetId: string
  title: string
  description: string
  position: 'top' | 'bottom' | 'center'
  /** 仅 center 步可用，替代纯文本描述的结构化内容 */
  content?: React.ReactNode
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-home-dynamics',
    title: '在途订单动态',
    description: '所有进行中的订单实时展示在这里，系统会自动定位到需要你操作的那一栏',
    position: 'bottom',
  },
  {
    targetId: 'tour-scanner',
    title: '扫码交互',
    description: '扫描无人车车身二维码，开启车厢、装卸货物、查看车辆状态',
    position: 'bottom',
  },
  {
    targetId: 'tour-bottom-nav',
    title: '底部导航',
    description: '首页查看在途订单动态，服务追踪查实时数据，订单管理查历史记录，个人中心管理账户',
    position: 'top',
  },
  {
    targetId: 'tour-service-entry',
    title: '下单入口',
    description: '从这里发起配送下单或巡游租车，支持整车、散件、贩卖、巡检四类服务',
    position: 'bottom',
  },
  {
    targetId: '',
    title: '演示模式说明',
    description: '',
    position: 'center',
    content: (
      <div className="text-left space-y-3">
        {/* 前言 */}
        <p className="text-[12px] text-[#666666] leading-relaxed">
          {"　　"}您当前体验的是<strong className="text-[#1A1A1A]">城市无人车综合服务平台</strong>的物流配送业务板块完整功能演示。
        </p>

        {/* 第一段：技术保障 */}
        <div>
          <h4 className="text-[12px] font-semibold text-[#1A1A1A] mb-1">▎ 技术保障</h4>
          <p className="text-[11px] text-[#999999] leading-relaxed">
            {"　　"}订单流转、车辆调度、状态推送均由<strong className="text-[#666666]">与生产环境完全一致</strong>的数据模型和状态机驱动。
            当前车辆数据为模拟数据，生产环境由无人车车载系统通过 IoT 实时上报。
          </p>
        </div>

        {/* 第二段：功能清单 */}
        <div>
          <h4 className="text-[12px] font-semibold text-[#1A1A1A] mb-1">▎ 演示模式包含</h4>
          <ul className="text-[11px] text-[#666666] leading-relaxed space-y-0.5 list-disc list-inside">
            <li>创建<strong className="text-[#1A1A1A]">整车配送</strong>和<strong className="text-[#1A1A1A]">散件直送</strong>订单</li>
            <li>完整的装货 → 运输 → 卸货 → 签收操作流程</li>
            <li>多车调度、运单追踪、交接凭证管理</li>
            <li>收货人不在自动跳过、货物异常签收等异常处理</li>
          </ul>
        </div>

        {/* 第三段：数据说明 */}
        <div className="bg-[#F5F6FA] rounded-lg px-3 py-2">
          <p className="text-[10px] text-[#999999] leading-relaxed">
            <strong className="text-[#666666]">提示：</strong>
            演示模式下的订单数据为平台预置样例。您也可以自行下单，系统将自动分配模拟车辆进入演示流转。
            所有操作记录和状态变更均受到与生产环境相同的状态机约束，确保体验真实可靠。
          </p>
        </div>
      </div>
    ),
  },
]

const POPUP_GAP = 12
const POPUP_MAX_HEIGHT = 200

/** 自适应计算弹窗位置：优先按预设方向，空间不够自动翻转，限制在手机壳内 */
function calcPopupStyle(
  targetRect: DOMRect | null,
  phoneRect: DOMRect | null,
  preferredPos: 'top' | 'bottom',
): { top?: number; bottom?: number } {
  if (!targetRect || !phoneRect) return { top: phoneRect ? phoneRect.top + phoneRect.height * 0.3 : undefined }

  const relTargetTop = targetRect.top - phoneRect.top
  const relTargetBottom = targetRect.bottom - phoneRect.top
  const phoneHeight = phoneRect.height

  const spaceBelow = phoneHeight - relTargetBottom - POPUP_GAP
  const spaceAbove = relTargetTop - POPUP_GAP

  const actualPos: 'top' | 'bottom' =
    preferredPos === 'bottom' && spaceBelow >= POPUP_MAX_HEIGHT ? 'bottom'
    : preferredPos === 'top' && spaceAbove >= POPUP_MAX_HEIGHT ? 'top'
    : spaceBelow >= spaceAbove ? 'bottom'
    : 'top'

  if (actualPos === 'bottom') {
    const top = targetRect.bottom + POPUP_GAP
    const maxTop = phoneRect.bottom - POPUP_MAX_HEIGHT - POPUP_GAP
    return { top: Math.min(top, maxTop) }
  } else {
    const bottom = window.innerHeight - targetRect.top + POPUP_GAP
    const maxBottom = window.innerHeight - phoneRect.top - POPUP_GAP
    return { bottom: Math.min(bottom, maxBottom) }
  }
}

export function TourOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [phoneRect, setPhoneRect] = useState<DOMRect | null>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  const currentStep = TOUR_STEPS[step]

  const updateRects = useCallback(() => {
    // 获取手机壳容器边界
    const phone = document.querySelector('.phone-shell') as HTMLElement | null
    if (phone) setPhoneRect(phone.getBoundingClientRect())

    const el = document.getElementById(currentStep.targetId)
    setTargetRect(el ? el.getBoundingClientRect() : null)
  }, [currentStep.targetId])

  useEffect(() => {
    updateRects()
    const timer = setInterval(updateRects, 200)
    return () => clearInterval(timer)
  }, [updateRects])

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) setStep((s) => s + 1)
    else onClose()
  }

  const handlePrev = () => setStep((s) => Math.max(0, s - 1))

  const isCenter = currentStep.position === 'center'

  const popupBaseStyle = calcPopupStyle(targetRect, phoneRect, currentStep.position as 'top' | 'bottom')

  // 高亮框 & 遮罩坐标 — viewBox 与 phone 同尺寸，直接用像素
  const maskHighlight = targetRect && phoneRect && !isCenter
    ? {
        x: targetRect.left - phoneRect.left,
        y: targetRect.top - phoneRect.top,
        w: targetRect.width,
        h: targetRect.height,
      }
    : null

  // 高亮边框
  const highlightStyle = targetRect && phoneRect && !isCenter
    ? {
        left: targetRect.left - 2,
        top: targetRect.top - 2,
        width: targetRect.width + 4,
        height: targetRect.height + 4,
      }
    : undefined

  return (
    <div className="fixed inset-0 z-[200]" style={{ pointerEvents: 'none' }}>
      {/* 手机壳裁剪区域 — 所有视觉元素限制在此范围内 */}
      {phoneRect && (
        <div
          className="absolute overflow-hidden"
          style={{ left: phoneRect.left, top: phoneRect.top, width: phoneRect.width, height: phoneRect.height, borderRadius: 44 }}
        >
          {/* 遮罩层 */}
          <svg
            className="absolute inset-0"
            viewBox={`0 0 ${phoneRect.width} ${phoneRect.height}`}
          >
            <defs>
              <mask id="tour-mask">
                <rect width={phoneRect.width} height={phoneRect.height} fill="white" />
                {maskHighlight && (
                  <rect
                    x={maskHighlight.x}
                    y={maskHighlight.y}
                    width={maskHighlight.w}
                    height={maskHighlight.h}
                    rx="2"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect width={phoneRect.width} height={phoneRect.height} fill="rgba(0,0,0,0.6)" mask="url(#tour-mask)" />
          </svg>

          {/* 高亮框 — 四角跟随手机壳圆角 */}
          {highlightStyle && (
            <div
              className="absolute border-2 border-[#1677FF] shadow-[0_0_12px_rgba(22,119,255,0.5)] transition-all duration-300"
              style={{
                left: highlightStyle.left - phoneRect.left,
                top: highlightStyle.top - phoneRect.top,
                width: highlightStyle.width,
                height: highlightStyle.height,
                borderRadius: 12,
              }}
            />
          )}
        </div>
      )}

      {/* 弹窗 */}
      <div style={{ pointerEvents: 'auto' }}>
        <div
          ref={popupRef}
          className={`absolute left-3 right-3 mx-auto max-w-[300px] ${
            isCenter ? 'top-1/2 -translate-y-1/2' : ''
          }`}
          style={!isCenter ? popupBaseStyle : undefined}
        >
          {!isCenter && (
            <div className="bg-white rounded-xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] text-[#1677FF] font-medium">
                  {step + 1} / {TOUR_STEPS.length}
                </span>
                <button onClick={onClose} className="text-[#999999] hover:text-[#666666]">
                  <X size="14" />
                </button>
              </div>
              <h3 className="text-[14px] font-medium text-[#1A1A1A] mb-1">{currentStep.title}</h3>
              <p className="text-[12px] text-[#666666] leading-relaxed">{currentStep.description}</p>
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={handlePrev}
                  disabled={step === 0}
                  className="flex items-center gap-1 text-[12px] text-[#999999] disabled:opacity-30 hover:text-[#666666]"
                >
                  <ChevronLeft size="14" /> 上一步
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1 px-4 py-1.5 bg-[#1677FF] text-white text-[12px] rounded-lg hover:bg-[#4096FF] active:bg-[#0958D9] transition-colors"
                >
                  {step === TOUR_STEPS.length - 1 ? '完成' : '下一步'} <ChevronRight size="14" />
                </button>
              </div>
            </div>
          )}
          {isCenter && (
            <div className="bg-white rounded-xl p-5 shadow-2xl text-center">
              <h3 className="text-[15px] font-medium text-[#1A1A1A] mb-3">{currentStep.title}</h3>
              {currentStep.content ?? (
                <p className="text-[12px] text-[#666666] leading-relaxed">{currentStep.description}</p>
              )}
              <button
                onClick={handleNext}
                className="mt-4 px-6 py-2 bg-[#1677FF] text-white text-[13px] rounded-lg hover:bg-[#4096FF] active:bg-[#0958D9] transition-colors"
              >
                开始使用
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 分页指示器 */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2" style={{ pointerEvents: 'auto' }}>
        {TOUR_STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              i === step ? 'bg-[#1677FF]' : i < step ? 'bg-[#CCCCCC]' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* 跳过按钮 */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-[12px] text-white/60 hover:text-white transition-colors"
        style={{ pointerEvents: 'auto' }}
      >
        跳过
      </button>
    </div>
  )
}
