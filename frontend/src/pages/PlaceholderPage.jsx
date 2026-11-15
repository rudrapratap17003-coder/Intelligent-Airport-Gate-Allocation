import React from 'react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { Sparkles, Terminal } from 'lucide-react'

export const PlaceholderPage = ({
  title,
  description,
  phase,
  icon: Icon = Sparkles,
  formula,
  actions
}) => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#1e3a5f]/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gw-cyan/10 border border-gw-cyan/20 text-gw-cyan shrink-0">
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="gw-page-heading">{title}</h1>
            <p className="text-sm text-gw-text-secondary mt-1">{description}</p>
          </div>
        </div>
        {phase && (
          <Badge variant="cyan" size="md" className="self-start sm:self-auto shrink-0">
            Scheduled: {phase}
          </Badge>
        )}
      </div>

      {/* Main Showcase Card */}
      <Card className="border-dashed border-2 border-[#1e3a5f]/80">
        <div className="py-10 px-4 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-gw-bg-secondary flex items-center justify-center text-gw-cyan border border-[#1e3a5f]">
            <Icon className="w-6 h-6 animate-pulse" />
          </div>

          <h3 className="gw-section-heading">Architecture Verified & Linked</h3>
          
          <p className="text-xs sm:text-sm text-gw-text-secondary leading-relaxed">
            This module is connected via React Router and styled with the GateWise dark aviation system.
            Full algorithmic interactions and live database bindings will be implemented in {phase}.
          </p>

          {formula && (
            <div className="mt-4 text-left">
              <span className="text-[11px] font-mono uppercase tracking-wider text-gw-text-secondary block mb-1">
                Mathematical Foundation:
              </span>
              <div className="gw-formula-box text-xs">
                {formula}
              </div>
            </div>
          )}

          {actions && <div className="pt-2">{actions}</div>}
        </div>
      </Card>
    </div>
  )
}

export default PlaceholderPage
