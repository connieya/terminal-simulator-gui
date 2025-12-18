import { useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  type?: ToastType
  duration?: number
  onClose: () => void
}

/**
 * Toast 알림 컴포넌트
 */
export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  }[type]

  return (
    <div
      className={`${bgColor} text-white px-6 py-3 rounded-lg shadow-lg animate-in slide-in-from-right fade-in-0 min-w-[200px]`}
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-2">
        <span>{message}</span>
        <button className="text-white hover:text-gray-200 font-bold text-lg leading-none">×</button>
      </div>
    </div>
  )
}

