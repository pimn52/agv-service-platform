'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, X } from 'lucide-react'

interface ToastMessage {
  id: number
  message: string
}

let toastId = 0
let pushToast: ((msg: string) => void) | null = null

export function toast(message: string) {
  pushToast?.(message)
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  pushToast = useCallback((message: string) => {
    const id = ++toastId
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }, [])

  return (
    <div className="absolute top-[132px] left-1/2 -translate-x-1/2 z-[200] flex flex-col items-center gap-2 pointer-events-none w-[calc(100%-2rem)] max-w-[343px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="flex items-center gap-2 bg-[#1A1A1A] text-white text-[12px] px-4 py-2.5 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-2 pointer-events-auto"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-[#52C41A]" />
          {t.message}
        </div>
      ))}
    </div>
  )
}
