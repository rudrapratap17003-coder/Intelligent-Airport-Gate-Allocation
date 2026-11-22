import React from 'react'

export const PageLoadingFallback = ({ title = 'Loading Module...', fullScreen = false }) => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={title}
      className={`w-full flex flex-col items-center justify-center p-8 transition-opacity duration-200 ${
        fullScreen ? 'min-h-screen bg-[#090909]' : 'min-h-[60vh]'
      }`}
    >
      <div className="w-full max-w-4xl space-y-6">
        {/* Top Header Placeholder */}
        <div className="flex items-center justify-between border-b border-[#333333] pb-4">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-[#222222] rounded animate-pulse" />
            <div className="h-3.5 w-72 bg-[#181818] rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#A3A3A3]">
            <div className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>INITIALIZING</span>
          </div>
        </div>

        {/* Metric Cards Placeholder */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[#181818] border border-[#333333] space-y-3"
            >
              <div className="h-3 w-20 bg-[#222222] rounded animate-pulse" />
              <div className="h-7 w-24 bg-[#2A2A2A] rounded animate-pulse" />
              <div className="h-2.5 w-32 bg-[#222222] rounded animate-pulse" />
            </div>
          ))}
        </div>

        {/* Main Content Area Placeholder */}
        <div className="rounded-xl bg-[#181818] border border-[#333333] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 bg-[#222222] rounded animate-pulse" />
            <div className="h-8 w-24 bg-[#222222] rounded animate-pulse" />
          </div>
          <div className="space-y-2 pt-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-10 w-full bg-[#222222]/60 rounded border border-[#333333]/40 animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">{title}</span>
    </div>
  )
}

export default PageLoadingFallback
