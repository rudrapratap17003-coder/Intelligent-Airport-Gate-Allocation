import React from 'react'

export const Skeleton = ({ className = '', ...props }) => {
  return (
    <div
      className={`gw-skeleton bg-gw-bg-secondary/80 rounded-md ${className}`}
      {...props}
    />
  )
}

export const TableSkeleton = ({ rows = 5, cols = 4, className = '' }) => {
  return (
    <div className={`w-full space-y-2.5 p-4 ${className}`}>
      {/* Header skeleton */}
      <div className="grid grid-cols-4 gap-4 pb-2 border-b border-[#1e3a5f]/40">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={`th-${i}`} className="h-4 w-3/4" />
        ))}
      </div>
      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`tr-${r}`} className="grid grid-cols-4 gap-4 py-2 border-b border-[#1e3a5f]/20">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={`td-${r}-${c}`} className="h-4 w-5/6" />
          ))}
        </div>
      ))}
    </div>
  )
}

export const CardSkeleton = ({ className = '' }) => {
  return (
    <div className={`p-5 rounded-xl bg-gw-card border border-[#1e3a5f]/50 space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  )
}

export default Skeleton
