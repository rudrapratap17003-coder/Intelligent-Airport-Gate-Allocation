import React from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Cpu,
  Layers,
  Calculator,
  Grid3X3,
  ShieldCheck,
  Code2,
  Terminal,
  Plane
} from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

export const About = () => {
  return (
    <div className="space-y-8 animate-fadeIn max-w-6xl mx-auto">
      {/* ----------------- 1. HEADER & HERO ----------------- */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-[#333333]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="gw-page-heading">About GateWise & Mathematical Methodology</h1>
            <Badge variant="default" size="sm" dot>
              Phase 28 Active
            </Badge>
          </div>
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            Intelligent Airport Gate Allocation framework using exact combinatorial formulations of Rook Polynomials and the Principle of Inclusion-Exclusion.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link to="/airport-map">
            <Button size="md" variant="outline">
              Airport Map
            </Button>
          </Link>
          <Link to="/terminals">
            <Button size="md" variant="outline">
              Terminals
            </Button>
          </Link>
          <Link to="/math-explorer">
            <Button size="md" icon={BookOpen}>
              Math Explorer
            </Button>
          </Link>
        </div>
      </div>

      {/* ----------------- BLR DIGITAL TWIN DATA ARCHITECTURE ----------------- */}
      <Card className="p-6 border-[#333333] bg-[#181818] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#333333]">
          <Plane className="w-5 h-5 text-white" />
          <h2 className="text-base font-bold text-white">GateWise BLR — Bengaluru Airport Digital Twin Prototype</h2>
        </div>
        <p className="text-sm text-gw-text-secondary leading-relaxed">
          GateWise BLR is an academic operational digital twin modeled specifically around <strong>Kempegowda International Airport (BLR / VOBL)</strong> in Devanahalli, Bengaluru. It simulates airport gate allocations, turnaround occupancy windows, and terminal operational constraints across <strong>Terminal 1 (Dedicated Domestic)</strong> and <strong>Terminal 2 (International & Premium Domestic)</strong>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-[#111111] border border-[#333333] space-y-1.5">
            <div className="text-xs font-mono font-bold text-white uppercase tracking-wide">
              Tier 1: Verified Public Data
            </div>
            <p className="text-[11px] text-gw-text-secondary leading-relaxed">
              Official IATA (BLR) / ICAO (VOBL) identifiers, coordinates (13°11'56" N), runways (09L/27R CAT I & 09R/27L CAT III-B), airline terminal allocations, and published terminal opening dates.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#111111] border border-[#333333] space-y-1.5">
            <div className="text-xs font-mono font-bold text-white uppercase tracking-wide">
              Tier 2: Configurable Demo Data
            </div>
            <p className="text-[11px] text-gw-text-secondary leading-relaxed">
              Demonstration apron stands (Contact Aerobridge vs Remote Bus Apron), maximum wingspan limits, passenger capacity thresholds, and jetway configurations.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-[#111111] border border-[#333333] space-y-1.5">
            <div className="text-xs font-mono font-bold text-white uppercase tracking-wide">
              Tier 3: Simulated Operational Data
            </div>
            <p className="text-[11px] text-gw-text-secondary leading-relaxed">
              Simulated flight arrivals, turnaround timelines (45m narrow-body to 90–120m wide-body), schedule delay events, and discrete math gate allocations.
            </p>
          </div>
        </div>
        <p className="text-[11px] text-gw-text-secondary italic pt-1 border-t border-[#333333]">
          * Disclaimer: Academic research prototype. Not connected to BIAL internal operational systems, live AODB data, or airline operational feeds.
        </p>
      </Card>

      {/* ----------------- 2. SYSTEM OVERVIEW ----------------- */}
      <Card className="p-6 border-[#333333] bg-[#181818] space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-[#333333]">
          <Plane className="w-5 h-5 text-white" />
          <h2 className="text-base font-bold text-white">System Overview & Educational Purpose</h2>
        </div>
        <p className="text-sm text-gw-text-secondary leading-relaxed">
          <strong>GateWise</strong> is an educational and operational discrete mathematics platform designed to address the
          <strong> Flight-to-Gate Allocation Problem (AGAP)</strong>. In modern hub airports, allocating aircraft to gates
          involves managing dense operational restrictions—such as wingspan clearances, jet bridge compatibility, customs isolation,
          and terminal turnarounds.
        </p>
        <p className="text-sm text-gw-text-secondary leading-relaxed">
          Rather than relying solely on black-box heuristics or brute-force permutations (which explode factorially as $n!$),
          GateWise applies classical combinatorial mathematics to compute the <strong>exact integer number of valid conflict-free
          assignments</strong> in sub-millisecond execution time, followed by constraint-directed backtracking to generate the actual
          allocation plans.
        </p>
      </Card>

      {/* ----------------- 3. MATHEMATICAL FOUNDATION ----------------- */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-white" />
          Discrete Mathematical Formulations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Restriction Board */}
          <Card className="p-5 border-[#333333] bg-[#181818] space-y-3">
            <span className="text-xs uppercase font-mono tracking-wider text-white font-bold flex items-center gap-1.5">
              <Grid3X3 className="w-4 h-4 text-white" />
              1. Binary Restriction Board B
            </span>
            <p className="text-xs text-gw-text-secondary leading-relaxed">
              Let $B$ be an $n \times n$ binary matrix where:
            </p>
            <div className="p-3 rounded-lg bg-[#111111] font-mono text-xs text-white space-y-1 border border-[#333333]">
              <div>B[i][j] = 0 : Flight i is ALLOWED at Gate j</div>
              <div>B[i][j] = 1 : Flight i is FORBIDDEN from Gate j</div>
            </div>
            <p className="text-xs text-gw-text-secondary leading-relaxed">
              Allowed pairings correspond to non-restricted cells. Forbidden cells correspond to restricted cells.
            </p>
          </Card>

          {/* Card 2: Permutation Universe */}
          <Card className="p-5 border-[#333333] bg-[#181818] space-y-3">
            <span className="text-xs uppercase font-mono tracking-wider text-white font-bold flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-white" />
              2. Permutation Universe S₀
            </span>
            <p className="text-xs text-gw-text-secondary leading-relaxed">
              Without restrictions, $n$ flights can be assigned to $n$ gates in exactly $n!$ ways:
            </p>
            <div className="p-3 rounded-lg bg-[#111111] font-mono text-xs text-white font-bold text-center border border-[#333333]">
              S₀ = n! = n × (n - 1) × ... × 1
            </div>
            <p className="text-xs text-gw-text-secondary leading-relaxed">
              As $n$ grows, $n!$ explodes (e.g. $6! = 720$, $8! = 40,320$). Combinatorial formulas avoid evaluating all permutations individually.
            </p>
          </Card>

          {/* Card 3: Rook Polynomial */}
          <Card className="p-5 border-[#333333] bg-[#181818] space-y-3">
            <span className="text-xs uppercase font-mono tracking-wider text-white font-bold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-white" />
              3. Rook Polynomial R(B, x)
            </span>
            <p className="text-xs text-gw-text-secondary leading-relaxed">
              The generating function for non-attacking rook placements on forbidden cells of board $B$:
            </p>
            <div className="p-3 rounded-lg bg-[#111111] font-mono text-xs text-white font-bold text-center border border-[#333333]">
              R(B, x) = r₀ + r₁x + r₂x² + ... + rₙxⁿ
            </div>
            <p className="text-xs text-gw-text-secondary leading-relaxed">
              Where $r_k$ is the exact number of ways to place $k$ non-attacking rooks on forbidden cells. Computed in O(n · 2ⁿ) via row-based dynamic programming with bitmask state.
            </p>
          </Card>

          {/* Card 4: Principle of Inclusion-Exclusion */}
          <Card className="p-5 border-[#333333] bg-[#181818] space-y-3">
            <span className="text-xs uppercase font-mono tracking-wider text-white font-bold flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-white" />
              4. Principle of Inclusion-Exclusion
            </span>
            <p className="text-xs text-gw-text-secondary leading-relaxed">
              The master equation combining rook polynomial coefficients with remaining factorial terms:
            </p>
            <div className="p-3 rounded-lg bg-[#111111] font-mono text-xs text-white font-bold text-center border border-[#333333]">
              N = ∑ₖ₌₀ⁿ (-1)ᵏ · rₖ · (n - k)!
            </div>
            <p className="text-xs text-gw-text-secondary leading-relaxed">
              Yields the exact integer count $N$ of conflict-free valid assignments using pure arbitrary-precision integer arithmetic.
            </p>
          </Card>
        </div>
      </div>

      {/* ----------------- 4. ARCHITECTURE & TECH STACK ----------------- */}
      <Card className="p-6 border-[#333333] bg-[#181818] space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2 pb-3 border-b border-[#333333]">
          <Code2 className="w-5 h-5 text-white" />
          Technical Stack & Engineering Design
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#111111] border border-[#333333] space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase font-mono">
              <Terminal className="w-4 h-4" />
              Backend Engine
            </div>
            <ul className="text-xs text-gw-text-secondary space-y-1 font-mono">
              <li>• Python 3.14 Core</li>
              <li>• FastAPI Asynchronous REST</li>
              <li>• SQLAlchemy 2.x ORM</li>
              <li>• SQLite Local Persistence</li>
              <li>• Pytest Suite (156 Tests)</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#111111] border border-[#333333] space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase font-mono">
              <Code2 className="w-4 h-4" />
              Frontend Interface
            </div>
            <ul className="text-xs text-gw-text-secondary space-y-1 font-mono">
              <li>• React 19 Modern Hooks</li>
              <li>• Vite 8 Bundler</li>
              <li>• Tailwind CSS v4 Engine</li>
              <li>• Recharts Combinatorial Viz</li>
              <li>• Lucide Aviation Icons</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-[#111111] border border-[#333333] space-y-2">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase font-mono">
              <ShieldCheck className="w-4 h-4" />
              Quality & Verification
            </div>
            <ul className="text-xs text-gw-text-secondary space-y-1 font-mono">
              <li>• Independent Conflict Auditor</li>
              <li>• Zero Hardcoded / Mock Math</li>
              <li>• Deterministic Invariant Checks</li>
              <li>• Exact Arbitrary-Precision Math</li>
              <li>• Zero Frontend Build Errors</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* ----------------- 5. NAVIGATION QUICK JUMP ----------------- */}
      <Card className="p-6 border-[#333333] text-center space-y-4 bg-[#181818]">
        <h3 className="text-base font-bold text-white">Explore the GateWise Platform</h3>
        <p className="text-xs text-gw-text-secondary max-w-xl mx-auto leading-relaxed">
          Experience real-time discrete mathematics in action. Run custom flight allocations, explore rook placement configurations, and analyze scenario bottlenecks.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link to="/dashboard">
            <Button size="md" variant="primary">
              Live Operations Dashboard
            </Button>
          </Link>
          <Link to="/simulator">
            <Button size="md" variant="outline">
              Allocation Simulator & Bipartite Diagram
            </Button>
          </Link>
          <Link to="/math-explorer">
            <Button size="md" variant="outline">
              Discrete Math Explorer Sandbox
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default About
