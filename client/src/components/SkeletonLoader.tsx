import React from 'react'
import { cn } from '../lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  animation?: 'pulse' | 'wave' | 'none'
}

export default function SkeletonLoader({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps) {
  const baseClasses = 'bg-[#1a1a1a] rounded'

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  }

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  }

  const style: React.CSSProperties = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={style}
    />
  )
}


export function ScriptCardSkeleton() {
  return (
    <div className="border border-[#ffffff10] rounded-xl p-5 bg-[#1a1a1a] space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <SkeletonLoader variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <SkeletonLoader variant="text" width="60%" height={20} />
            <SkeletonLoader variant="text" width="80%" height={16} />
          </div>
        </div>
        <SkeletonLoader variant="rectangular" width={120} height={32} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SkeletonLoader variant="rectangular" height={60} />
        <SkeletonLoader variant="rectangular" height={60} />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <SkeletonLoader variant="text" width="80%" />
        </td>
      ))}
    </tr>
  )
}

export function UserCardSkeleton() {
  return (
    <div className="p-4 border border-[#ffffff10] rounded-lg bg-[#1a1a1a] space-y-3">
      <div className="flex items-center space-x-3">
        <SkeletonLoader variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" width="40%" height={16} />
          <SkeletonLoader variant="text" width="60%" height={14} />
        </div>
      </div>
      <div className="flex gap-2">
        <SkeletonLoader variant="rectangular" width={80} height={24} />
        <SkeletonLoader variant="rectangular" width={80} height={24} />
      </div>
    </div>
  )
}

