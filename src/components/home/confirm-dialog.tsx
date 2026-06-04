'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'

/** 术语映射：根据 deliveryMode 决定所有按钮/提示文案 */
const LABELS = {
  full_load: {
    confirmNormal: '正常签收',
    rejectAbnormal: '拒绝签收',
    continueAbnormal: '继续签收（记录异常）',
  },
  ltl: {
    confirmNormal: '确认取件',
    rejectAbnormal: '拒绝取件',
    continueAbnormal: '继续取件（记录异常）',
  },
} as const

interface ConfirmDialogProps {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  /** 物流配送模式（决定签收/取件等按钮术语）。不传则 fallback 到整车术语。 */
  deliveryMode?: 'full_load' | 'ltl'
  /** 显示"货物异常"勾选项（仅签收/取件等交接场景使用） */
  anomaly?: {
    onContinue: (note: string) => void
    onReject: (note: string) => void
  }
}

export function ConfirmDialog({ title, message, onConfirm, onCancel, deliveryMode, anomaly }: ConfirmDialogProps) {
  const [hasAnomaly, setHasAnomaly] = useState(false)
  const [anomalyNote, setAnomalyNote] = useState('')

  const t = LABELS[deliveryMode ?? 'full_load']

  if (!anomaly) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 rounded-xl">
        <div className="bg-white rounded-xl p-4 mx-6 shadow-xl max-w-[280px] w-full">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-[#FAAD14]" />
            <span className="text-[13px] font-medium text-[#1A1A1A]">{title}</span>
          </div>
          <p className="text-[12px] text-[#666666] mb-4 leading-relaxed">{message}</p>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-[12px] text-[#666666] bg-[#F5F6FA] hover:bg-[#E8ECF0] active:bg-[#DDDDDD] transition-colors">取消</button>
            <button onClick={onConfirm} className="flex-1 py-2 rounded-lg text-[12px] text-white bg-[#1677FF] hover:bg-[#4096FF] active:bg-[#0958D9] transition-colors">确认</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 rounded-xl">
      <div className="bg-white rounded-xl p-4 mx-6 shadow-xl max-w-[300px] w-full">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-[#FAAD14]" />
          <span className="text-[13px] font-medium text-[#1A1A1A]">{title}</span>
        </div>
        <p className="text-[12px] text-[#666666] mb-3 leading-relaxed">{message}</p>

        {/* 异常勾选 */}
        <label className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${hasAnomaly ? 'bg-[#FFF2F0]' : 'bg-[#F5F6FA]'}`}>
          <input type="checkbox" checked={hasAnomaly} onChange={(e) => setHasAnomaly(e.target.checked)} className="w-3.5 h-3.5 accent-[#FF4D4F]" />
          <span className={`text-[12px] ${hasAnomaly ? 'text-[#FF4D4F] font-medium' : 'text-[#666666]'}`}>货物存在异常（包装破损/数量不符等）</span>
        </label>

        {hasAnomaly && (
          <textarea
            placeholder="请描述异常情况..."
            value={anomalyNote}
            onChange={(e) => setAnomalyNote(e.target.value)}
            className="w-full mt-2 px-3 py-2 bg-[#FFF2F0] border border-[#FFCCC7] rounded-lg text-[12px] outline-none focus:border-[#FF4D4F] resize-none h-16"
          />
        )}

        {hasAnomaly ? (
          <div className="flex gap-2 mt-3">
            <button onClick={() => anomaly.onReject(anomalyNote)} className="flex-1 py-2 rounded-lg text-[12px] text-[#FF4D4F] bg-[#FFF2F0] border border-[#FFCCC7] hover:bg-[#FFE4E0] active:bg-[#FFD6D0] transition-colors">{t.rejectAbnormal}</button>
            <button onClick={() => anomaly.onContinue(anomalyNote)} className="flex-[1.5] py-2 rounded-lg text-[12px] text-[#FAAD14] bg-[#FFFBE6] border border-[#FFE58F] hover:bg-[#FFF7CC] active:bg-[#FFF3B0] transition-colors">{t.continueAbnormal}</button>
          </div>
        ) : (
          <div className="flex gap-2 mt-3">
            <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-[12px] text-[#666666] bg-[#F5F6FA] hover:bg-[#E8ECF0] active:bg-[#DDDDDD] transition-colors">取消</button>
            <button onClick={onConfirm} className="flex-1 py-2 rounded-lg text-[12px] text-white bg-[#52C41A] hover:bg-[#73D13D] active:bg-[#389E0D] transition-colors">{t.confirmNormal}</button>
          </div>
        )}
      </div>
    </div>
  )
}
