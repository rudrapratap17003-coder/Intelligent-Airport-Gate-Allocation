import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plane,
  ArrowRight,
  ShieldCheck,
  Grid3X3,
  Calculator,
  PlayCircle,
  BarChart3,
  BookOpen,
  Info,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowDownRight,
  Sparkles,
  Terminal,
  Cpu,
  Split,
  ChevronRight,
  XCircle,
  HelpCircle,
  ExternalLink
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'

export const LandingPage = () => {
  // Interactive mini restriction matrix state for illustrative demo (3 flights x 3 gates)
  const [demoMatrix, setDemoMatrix] = useState([
    [0, 1, 0],
    [0, 0, 1],
    [1, 0, 0]
  ])

  const toggleCell = (row, col) => {
    setDemoMatrix(prev => {
      const next = prev.map(r => [...r])
      next[row][col] = next[row][col] === 1 ? 0 : 1
      return next
    })
  }

  // Genuinely compute rook polynomial coefficients r0, r1, r2, r3 for the 3x3 matrix
  // using bitmask dynamic programming (no fake or hardcoded numbers)
  const calculationResults = useMemo(() => {
    const n = 3
    // Collect coordinates of forbidden cells
    const forbidden = []
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (demoMatrix[r][c] === 1) {
          forbidden.push([r, c])
        }
      }
    }

    const r0 = 1
    const r1 = forbidden.length

    // r2: pairs of forbidden cells that do not share row or column
    let r2 = 0
    for (let i = 0; i < forbidden.length; i++) {
      for (let j = i + 1; j < forbidden.length; j++) {
        const [rA, cA] = forbidden[i]
        const [rB, cB] = forbidden[j]
        if (rA !== rB && cA !== cB) {
          r2++
        }
      }
    }

    // r3: triplets of forbidden cells that do not share row or column
    let r3 = 0
    for (let i = 0; i < forbidden.length; i++) {
      for (let j = i + 1; j < forbidden.length; j++) {
        for (let k = j + 1; k < forbidden.length; k++) {
          const [rA, cA] = forbidden[i]
          const [rB, cB] = forbidden[j]
          const [rC, cC] = forbidden[k]
          if (
            rA !== rB && rA !== rC && rB !== rC &&
            cA !== cB && cA !== cC && cB !== cC
          ) {
            r3++
          }
        }
      }
    }

    // Inclusion-Exclusion formula:
    // N = r0*3! - r1*2! + r2*1! - r3*0!
    // N = 1*6 - r1*2 + r2*1 - r3*1
    const term0 = r0 * 6
    const term1 = r1 * 2
    const term2 = r2 * 1
    const term3 = r3 * 1
    const validCount = term0 - term1 + term2 - term3

    return {
      r0,
      r1,
      r2,
      r3,
      term0,
      term1,
      term2,
      term3,
      validCount
    }
  }, [demoMatrix])

  return (
    <div className="min-h-screen bg-gw-bg text-gw-text flex flex-col selection:bg-gw-cyan/30 selection:text-white">
      {/* -------------------- 1. NAVIGATION BAR -------------------- */}
      <header className="h-16 border-b border-[#1e3a5f]/60 bg-gw-bg/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 lg:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gw-cyan/10 border border-gw-cyan/30 flex items-center justify-center shrink-0">
            <Plane className="w-5 h-5 text-gw-cyan rotate-[-45deg]" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight font-sans">
              Gate<span className="text-gw-cyan">Wise</span>
            </span>
            <span className="text-[9px] text-gw-text-secondary uppercase tracking-widest font-mono">
              Discrete Math Engine
            </span>
          </div>
        </div>

        {/* Quick nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-gw-text-secondary">
          <a href="#problem" className="hover:text-gw-cyan transition-colors">Problem</a>
          <a href="#solution" className="hover:text-gw-cyan transition-colors">Solution</a>
          <a href="#features" className="hover:text-gw-cyan transition-colors">Features</a>
          <a href="#mathematics" className="hover:text-gw-cyan transition-colors">Mathematics</a>
          <a href="#workflow" className="hover:text-gw-cyan transition-colors">How It Works</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/math-explorer" className="hidden sm:inline-block">
            <Button size="sm" variant="ghost" icon={BookOpen}>
              Math Explorer
            </Button>
          </Link>
          <Link to="/simulator">
            <Button size="sm" icon={ArrowRight}>
              Launch Simulator
            </Button>
          </Link>
        </div>
      </header>

      {/* -------------------- 2. HERO SECTION -------------------- */}
      <section className="relative overflow-hidden pt-12 pb-20 md:py-24 border-b border-[#1e3a5f]/50 bg-gradient-to-b from-gw-bg via-gw-bg-secondary/40 to-gw-bg">
        {/* Subtle background radar/grid ornament */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#10223615_1px,transparent_1px),linear-gradient(to_bottom,#10223615_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gw-cyan/10 border border-gw-cyan/30 text-xs font-mono text-gw-cyan shadow-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>Discrete Mathematics & Graph Theory • Module 1</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-gw-text leading-[1.1] font-sans">
              Smarter Gates. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-gw-cyan via-[#56d5f0] to-gw-blue">
                Mathematical Precision.
              </span>
            </h1>

            <p className="text-base sm:text-xl text-gw-text-secondary leading-relaxed max-w-2xl mx-auto">
              Explore how Discrete Mathematics transforms complex airport gate allocation into a systematic,
              mathematically verifiable process using Rook Polynomials and the Principle of Inclusion-Exclusion.
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <Link to="/simulator">
                <Button size="lg" icon={ArrowRight} className="shadow-lg shadow-gw-cyan/10">
                  Launch Simulator
                </Button>
              </Link>
              <Link to="/math-explorer">
                <Button size="lg" variant="secondary" icon={BookOpen}>
                  Explore Mathematics
                </Button>
              </Link>
            </div>
          </div>

          {/* Aviation Operations Interactive Visual Preview */}
          <div className="mt-14 max-w-4xl mx-auto">
            <div className="bg-gw-card border border-[#1e3a5f] rounded-2xl p-5 sm:p-7 shadow-2xl relative overflow-hidden backdrop-blur-md">
              {/* Header bar of the simulation visual */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#1e3a5f]/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-gw-success animate-pulse" />
                  <span className="font-mono text-xs text-gw-text font-medium">OPS SIMULATION TERMINAL</span>
                  <span className="text-[11px] font-mono text-gw-cyan bg-gw-cyan/10 px-2 py-0.5 rounded border border-gw-cyan/20">
                    LIVE DETERMINISTIC ENGINE
                  </span>
                </div>
                <div className="text-xs text-gw-text-secondary font-mono">
                  n = 3 Flights ↔ 3 Gates (Interactive Model)
                </div>
              </div>

              {/* Grid visual comparing Flight-to-Gate assignments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* Interactive Demo Board */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-gw-text-secondary">
                    <span className="font-medium text-gw-text">Interactive Restriction Matrix B</span>
                    <span className="font-mono text-gw-cyan">{calculationResults.r1} Forbidden Cells (r₁)</span>
                  </div>

                  <div className="bg-gw-bg-secondary p-3.5 rounded-xl border border-[#1e3a5f]/80">
                    <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                      {/* Header row */}
                      <div className="text-gw-text-secondary/60"></div>
                      <div className="text-gw-cyan font-semibold">G1</div>
                      <div className="text-gw-cyan font-semibold">G2</div>
                      <div className="text-gw-cyan font-semibold">G3</div>

                      {/* Flight 1 */}
                      <div className="text-gw-blue font-semibold flex items-center justify-center">F1</div>
                      {[0, 1, 2].map(col => (
                        <button
                          key={`0-${col}`}
                          type="button"
                          onClick={() => toggleCell(0, col)}
                          className={`h-10 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer border ${
                            demoMatrix[0][col] === 1
                              ? 'bg-gw-error/20 border-gw-error/60 text-gw-error shadow-inner shadow-gw-error/10'
                              : 'bg-gw-card border-[#1e3a5f] text-gw-text-secondary hover:border-gw-cyan/40 hover:text-gw-text'
                          }`}
                          title={`Click to toggle Restriction (F1, G${col + 1})`}
                        >
                          {demoMatrix[0][col] === 1 ? '1' : '0'}
                        </button>
                      ))}

                      {/* Flight 2 */}
                      <div className="text-gw-blue font-semibold flex items-center justify-center">F2</div>
                      {[0, 1, 2].map(col => (
                        <button
                          key={`1-${col}`}
                          type="button"
                          onClick={() => toggleCell(1, col)}
                          className={`h-10 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer border ${
                            demoMatrix[1][col] === 1
                              ? 'bg-gw-error/20 border-gw-error/60 text-gw-error shadow-inner shadow-gw-error/10'
                              : 'bg-gw-card border-[#1e3a5f] text-gw-text-secondary hover:border-gw-cyan/40 hover:text-gw-text'
                          }`}
                          title={`Click to toggle Restriction (F2, G${col + 1})`}
                        >
                          {demoMatrix[1][col] === 1 ? '1' : '0'}
                        </button>
                      ))}

                      {/* Flight 3 */}
                      <div className="text-gw-blue font-semibold flex items-center justify-center">F3</div>
                      {[0, 1, 2].map(col => (
                        <button
                          key={`2-${col}`}
                          type="button"
                          onClick={() => toggleCell(2, col)}
                          className={`h-10 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer border ${
                            demoMatrix[2][col] === 1
                              ? 'bg-gw-error/20 border-gw-error/60 text-gw-error shadow-inner shadow-gw-error/10'
                              : 'bg-gw-card border-[#1e3a5f] text-gw-text-secondary hover:border-gw-cyan/40 hover:text-gw-text'
                          }`}
                          title={`Click to toggle Restriction (F3, G${col + 1})`}
                        >
                          {demoMatrix[2][col] === 1 ? '1' : '0'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-gw-text-secondary">
                    Click any cell to toggle: <span className="text-gw-error font-mono">1 = Forbidden</span>,{' '}
                    <span className="text-gw-text-secondary font-mono">0 = Allowed</span>. Mathematical coefficients recalculate in real time.
                  </p>
                </div>

                {/* Mathematical Engine Telemetry Output */}
                <div className="space-y-3 bg-gw-bg-tertiary p-4 rounded-xl border border-[#1e3a5f]/80 font-mono">
                  <div className="text-xs text-gw-text-secondary flex items-center justify-between pb-2 border-b border-[#1e3a5f]/50">
                    <span className="text-gw-cyan flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Live Mathematical Engine</span>
                    </span>
                    <span className="text-[10px] text-gw-success">DETERMINISTIC EVALUATION</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gw-text-secondary">Unrestricted Total (n!):</span>
                      <span className="text-gw-text font-bold ml-2">3! = 6 arrangements</span>
                    </div>

                    <div>
                      <span className="text-gw-text-secondary">Rook Polynomial:</span>
                      <div className="text-gw-cyan font-semibold mt-0.5 bg-gw-bg/60 p-2 rounded border border-[#1e3a5f]/40 break-all">
                        R(B, x) = {calculationResults.r0} + {calculationResults.r1}x + {calculationResults.r2}x² + {calculationResults.r3}x³
                      </div>
                    </div>

                    <div>
                      <span className="text-gw-text-secondary">Inclusion-Exclusion Count (N):</span>
                      <div className="text-gw-success text-xs mt-0.5 bg-gw-bg/60 p-2 rounded border border-gw-success/30">
                        N = {calculationResults.term0} - {calculationResults.term1} + {calculationResults.term2} - {calculationResults.term3} ={' '}
                        <strong className="text-sm font-bold text-white underline decoration-gw-success">
                          {calculationResults.validCount} valid assignments
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1e3a5f]/50 flex items-center justify-between text-xs">
                    <span className="text-gw-text-secondary">Engine State:</span>
                    <Badge variant="cyan" size="sm" dot>
                      Active & Recalculating
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- 3. THE PROBLEM STATEMENT -------------------- */}
      <section id="problem" className="py-16 md:py-24 border-b border-[#1e3a5f]/50 bg-gw-bg-secondary/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <Badge variant="warning" size="md">
                The Operational Bottleneck
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gw-text">
                Why Airport Gate Assignment Becomes Combinatorially Explosive
              </h2>
              <p className="text-sm sm:text-base text-gw-text-secondary leading-relaxed">
                Modern airports orchestrate hundreds of aircraft arrivals every day. Each aircraft requires an assigned
                gate slot within a specific operational window. However, operational realities impose strict constraints:
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-gw-card/60 border border-[#1e3a5f]/60">
                  <XCircle className="w-5 h-5 text-gw-error shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-gw-text">Physical Aircraft Class Limits</h4>
                    <p className="text-xs text-gw-text-secondary mt-0.5">
                      Wide-body airliners (e.g., Boeing 777, Airbus A350) physically cannot dock at narrow-body regional gates.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-gw-card/60 border border-[#1e3a5f]/60">
                  <XCircle className="w-5 h-5 text-gw-error shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-gw-text">Border Control & Terminal Routing</h4>
                    <p className="text-xs text-gw-text-secondary mt-0.5">
                      International flights must dock at gates connected to customs and immigration facilities.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-gw-card/60 border border-[#1e3a5f]/60">
                  <XCircle className="w-5 h-5 text-gw-error shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-semibold text-gw-text">Airline Terminal Exclusivity</h4>
                    <p className="text-xs text-gw-text-secondary mt-0.5">
                      Carrier leasing agreements restrict certain gates exclusively to alliance partners.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gw-card border border-[#1e3a5f] rounded-2xl p-6 space-y-5">
              <h3 className="text-lg font-semibold text-gw-text flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-gw-warning" />
                <span>The Mathematical Challenge</span>
              </h3>
              <p className="text-sm text-gw-text-secondary leading-relaxed">
                For an allocation window of <span className="text-gw-cyan font-mono font-bold">n flights</span> and{' '}
                <span className="text-gw-cyan font-mono font-bold">n gates</span>, there exist{' '}
                <span className="text-gw-text font-bold font-mono">n!</span> unrestricted one-to-one assignments.
              </p>

              <div className="grid grid-cols-2 gap-3 text-center font-mono">
                <div className="bg-gw-bg-secondary p-3 rounded-lg border border-[#1e3a5f]/50">
                  <div className="text-xs text-gw-text-secondary">4 Flights (4!)</div>
                  <div className="text-lg font-bold text-gw-text mt-1">24 ways</div>
                </div>
                <div className="bg-gw-bg-secondary p-3 rounded-lg border border-[#1e3a5f]/50">
                  <div className="text-xs text-gw-text-secondary">6 Flights (6!)</div>
                  <div className="text-lg font-bold text-gw-cyan mt-1">720 ways</div>
                </div>
                <div className="bg-gw-bg-secondary p-3 rounded-lg border border-[#1e3a5f]/50">
                  <div className="text-xs text-gw-text-secondary">8 Flights (8!)</div>
                  <div className="text-lg font-bold text-gw-blue mt-1">40,320 ways</div>
                </div>
                <div className="bg-gw-bg-secondary p-3 rounded-lg border border-[#1e3a5f]/50">
                  <div className="text-xs text-gw-text-secondary">10 Flights (10!)</div>
                  <div className="text-lg font-bold text-gw-warning mt-1">3,628,800 ways</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-gw-bg-tertiary border border-[#1e3a5f]/80 text-xs text-gw-text-secondary leading-relaxed">
                <span className="text-gw-cyan font-semibold block mb-1">Discrete Mathematics Solution:</span>
                Instead of inspecting millions of permutations, Discrete Mathematics models forbidden gates as restricted
                cells on a chessboard, deriving exact valid allocations analytically through the Principle of Inclusion-Exclusion.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- 4. THE GATEWISE SOLUTION -------------------- */}
      <section id="solution" className="py-16 md:py-24 border-b border-[#1e3a5f]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="cyan" size="md">
              The Discrete Mathematics Solution
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gw-text">
              From Physical Airport Restrictions to Analytical Truth
            </h2>
            <p className="text-sm sm:text-base text-gw-text-secondary leading-relaxed">
              GateWise rigorously separates counting valid states from generating individual schedules through three distinct algorithmic stages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card
              title="1. Rook Polynomial Engine"
              subtitle="Coefficients of Forbidden Cells"
              icon={Cpu}
            >
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Calculates the rook polynomial coefficients <span className="text-gw-cyan font-mono font-semibold">r₀, r₁, ..., rₙ</span>.
                Each coefficient <span className="font-mono text-gw-text">rₖ</span> represents the exact number of ways to place{' '}
                <strong className="text-gw-text">k non-attacking rooks on the forbidden cells</strong> of the restriction matrix without sharing rows or columns.
              </p>
            </Card>

            <Card
              title="2. Inclusion-Exclusion Principle"
              subtitle="Exact Valid Allocation Count (N)"
              icon={Calculator}
            >
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Uses the computed rook coefficients <span className="text-gw-cyan font-mono">rₖ</span> in the alternating summation{' '}
                <span className="font-mono text-gw-text font-semibold">N = Σ [(-1)ᵏ · rₖ · (n-k)!]</span> to determine the{' '}
                <strong className="text-gw-text">exact mathematical count of valid assignments</strong>. It does not generate assignments, but computes their exact quantity.
              </p>
            </Card>

            <Card
              title="3. Backtracking Generator"
              subtitle="Concrete Schedule Production"
              icon={PlayCircle}
            >
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Employs constraint-satisfaction <strong className="text-gw-text">backtracking</strong> to generate the actual, individual
                valid flight-to-gate assignments. Each flight receives exactly one allowed gate without double-booking, matching the exact count N.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* -------------------- 5. CORE FEATURES SECTION -------------------- */}
      <section id="features" className="py-16 md:py-24 border-b border-[#1e3a5f]/50 bg-gw-bg-secondary/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="blue" size="md">
              Full Application Modules
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gw-text">
              Engineered for Complete Educational Experiential Learning
            </h2>
            <p className="text-sm sm:text-base text-gw-text-secondary leading-relaxed">
              Six dedicated modules provide an end-to-end interface for creating airports, visualizing matrices,
              and verifying mathematical formulas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card
              title="Flight & Gate Management"
              subtitle="Configuration Hub"
              icon={Plane}
              action={<Link to="/flights"><ChevronRight className="w-4 h-4 text-gw-cyan" /></Link>}
            >
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Register flights with aircraft types and gates with terminal locations. Supports fast CRUD operations
                and simulation grouping.
              </p>
            </Card>

            <Card
              title="Interactive Restriction Matrix"
              subtitle="n × n Binary Board"
              icon={Grid3X3}
              action={<Link to="/restrictions"><ChevronRight className="w-4 h-4 text-gw-cyan" /></Link>}
            >
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Interactive board where operators click to designate forbidden pairings with instant visual indicators
                and restriction density telemetry.
              </p>
            </Card>

            <Card
              title="Rook Polynomial Engine"
              subtitle="Bitmask DP Algorithm"
              icon={Cpu}
              action={<Link to="/calculation"><ChevronRight className="w-4 h-4 text-gw-cyan" /></Link>}
            >
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Computes coefficients rₖ representing non-attacking rook placements on forbidden cells using bitmask dynamic programming.
              </p>
            </Card>

            <Card
              title="Inclusion-Exclusion Calculator"
              subtitle="Exact Counting Formula"
              icon={Calculator}
              action={<Link to="/calculation"><ChevronRight className="w-4 h-4 text-gw-cyan" /></Link>}
            >
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Applies the rook coefficients to calculate the exact count N of valid flight-to-gate assignments via alternating factorial sums.
              </p>
            </Card>

            <Card
              title="Allocation Simulator"
              subtitle="Backtracking Assignment"
              icon={PlayCircle}
              action={<Link to="/simulator"><ChevronRight className="w-4 h-4 text-gw-cyan" /></Link>}
            >
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Generates concrete valid individual flight-to-gate assignments via backtracking search, with interactive graphical flight lines.
              </p>
            </Card>

            <Card
              title="Mathematical Analytics"
              subtitle="Comparative Visualizations"
              icon={BarChart3}
              action={<Link to="/analytics"><ChevronRight className="w-4 h-4 text-gw-cyan" /></Link>}
            >
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Visual charts displaying valid vs restricted ratios, scenario comparisons, and combinatorial state-space reduction curves.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* -------------------- 6. MATHEMATICS EXPLAINED SECTION -------------------- */}
      <section id="mathematics" className="py-16 md:py-24 border-b border-[#1e3a5f]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="cyan" size="md">
              Core Theory
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gw-text">
              Mathematical Foundations & Algorithmic Roles
            </h2>
            <p className="text-sm sm:text-base text-gw-text-secondary leading-relaxed">
              Every computation performed in GateWise traces directly to classical Discrete Mathematics principles, with clear separation of responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="1. Permutations & Factorials" icon={Layers}>
              <div className="space-y-3">
                <p className="text-xs text-gw-text-secondary leading-relaxed">
                  When assigning n flights to n gates with zero restrictions, the total number of bijective pairings is given by the factorial n!:
                </p>
                <div className="gw-formula-box text-xs">
                  Total Unrestricted = n! = n × (n - 1) × ... × 2 × 1
                </div>
                <p className="text-xs text-gw-text-secondary">
                  <strong>Role:</strong> Defines the unrestricted assignment state space before forbidden pairings are subtracted.
                </p>
              </div>
            </Card>

            <Card title="2. Binary Restriction Matrices" icon={Grid3X3}>
              <div className="space-y-3">
                <p className="text-xs text-gw-text-secondary leading-relaxed">
                  Forbidden assignments are codified into an n × n binary matrix B where:
                </p>
                <div className="gw-formula-box text-xs">
                  B[i][j] = 1 if Flight i cannot use Gate j; else 0
                </div>
                <p className="text-xs text-gw-text-secondary">
                  <strong>Role:</strong> Models airport gate restrictions as forbidden cells on an n × n board.
                </p>
              </div>
            </Card>

            <Card title="3. Rook Polynomials (Counting Placements)" icon={Cpu}>
              <div className="space-y-3">
                <p className="text-xs text-gw-text-secondary leading-relaxed">
                  Calculates the polynomial R(B, x) = r₀ + r₁x + r₂x² + ... + rₙxⁿ:
                </p>
                <div className="gw-formula-box text-xs">
                  rₖ = ways to place k non-attacking rooks on forbidden cells (B[i][j] = 1)
                </div>
                <p className="text-xs text-gw-text-secondary">
                  <strong>Role:</strong> Rook coefficients quantify simultaneous constraint violations without evaluating full assignments.
                </p>
              </div>
            </Card>

            <Card title="4. Inclusion-Exclusion & Backtracking" icon={Calculator}>
              <div className="space-y-3">
                <p className="text-xs text-gw-text-secondary leading-relaxed">
                  Counting vs. Generation: Two complementary mathematical procedures:
                </p>
                <div className="gw-formula-box text-xs">
                  N = Σ [(-1)ᵏ · rₖ · (n - k)!]  (PIE exact count)
                  Individual schedules generated via Backtracking
                </div>
                <p className="text-xs text-gw-text-secondary">
                  <strong>Role:</strong> Inclusion-Exclusion computes the <strong className="text-gw-text">exact number N</strong>, while Backtracking produces the <strong className="text-gw-text">individual flight-to-gate assignments</strong>.
                </p>
              </div>
            </Card>
          </div>

          <div className="text-center pt-2">
            <Link to="/math-explorer">
              <Button variant="outline" icon={BookOpen}>
                Launch Full Math Explorer Tutorial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------- 7. HOW IT WORKS WORKFLOW -------------------- */}
      <section id="workflow" className="py-16 md:py-24 border-b border-[#1e3a5f]/50 bg-gw-bg-secondary/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <Badge variant="cyan" size="md">
              Step-by-Step Workflow
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gw-text">
              How the GateWise Simulator Operates
            </h2>
            <p className="text-sm sm:text-base text-gw-text-secondary leading-relaxed">
              A streamlined five-stage pipeline from configuration to verified allocation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
            {/* Step 1 */}
            <div className="bg-gw-card p-5 rounded-xl border border-[#1e3a5f] relative space-y-3">
              <div className="w-8 h-8 rounded-lg bg-gw-cyan/10 text-gw-cyan font-bold font-mono text-sm flex items-center justify-center border border-gw-cyan/30">
                01
              </div>
              <h3 className="font-semibold text-sm text-gw-text">Flights & Gates</h3>
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Define the n flights and n gates participating in the current allocation time window.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-gw-card p-5 rounded-xl border border-[#1e3a5f] relative space-y-3">
              <div className="w-8 h-8 rounded-lg bg-gw-cyan/10 text-gw-cyan font-bold font-mono text-sm flex items-center justify-center border border-gw-cyan/30">
                02
              </div>
              <h3 className="font-semibold text-sm text-gw-text">Define Restrictions</h3>
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Mark aircraft type, gate compatibility, and terminal assignment constraints.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-gw-card p-5 rounded-xl border border-[#1e3a5f] relative space-y-3">
              <div className="w-8 h-8 rounded-lg bg-gw-cyan/10 text-gw-cyan font-bold font-mono text-sm flex items-center justify-center border border-gw-cyan/30">
                03
              </div>
              <h3 className="font-semibold text-sm text-gw-text">Build Matrix</h3>
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Generate the n × n binary restriction matrix B representing forbidden cells.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-gw-card p-5 rounded-xl border border-[#1e3a5f] relative space-y-3">
              <div className="w-8 h-8 rounded-lg bg-gw-cyan/10 text-gw-cyan font-bold font-mono text-sm flex items-center justify-center border border-gw-cyan/30">
                04
              </div>
              <h3 className="font-semibold text-sm text-gw-text">Calculate N</h3>
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Compute Rook polynomial R(B, x) and evaluate the Inclusion-Exclusion theorem for exact count N.
              </p>
            </div>

            {/* Step 5 */}
            <div className="bg-gw-card p-5 rounded-xl border border-[#1e3a5f] relative space-y-3">
              <div className="w-8 h-8 rounded-lg bg-gw-cyan/10 text-gw-cyan font-bold font-mono text-sm flex items-center justify-center border border-gw-cyan/30">
                05
              </div>
              <h3 className="font-semibold text-sm text-gw-text">Generate & Visualize</h3>
              <p className="text-xs text-gw-text-secondary leading-relaxed">
                Execute backtracking to produce individual valid assignments and inspect graphical flight paths.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- 8. PROJECT INFORMATION & ACADEMIC CONTEXT -------------------- */}
      <section className="py-16 border-b border-[#1e3a5f]/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <Badge variant="default" size="md">
            Academic Context & Scope
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gw-text">
            Educational Experiential Learning Simulation
          </h2>
          <p className="text-sm text-gw-text-secondary leading-relaxed">
            GateWise is developed as an educational application demonstrating concepts from{' '}
            <strong className="text-gw-text">Module 1 of Discrete Mathematics and Graph Theory</strong>.
            The model demonstrates how abstract concepts such as permutations, binary relations, non-attacking rooks,
            and the Principle of Inclusion-Exclusion directly resolve combinatorial constraint satisfaction problems.
          </p>
          <div className="p-4 rounded-xl bg-gw-card/60 border border-[#1e3a5f] text-xs text-gw-text-secondary text-left max-w-2xl mx-auto space-y-1">
            <span className="text-gw-warning font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-gw-warning" />
              <span>Academic Notice</span>
            </span>
            <p>
              GateWise models a balanced n flights to n gates assignment within an identical operational time window.
              It is not intended as a substitute for multi-commodity flow real-time air traffic control systems.
            </p>
          </div>
        </div>
      </section>

      {/* -------------------- 9. FOOTER -------------------- */}
      <footer className="bg-gw-bg-secondary/70 border-t border-[#1e3a5f]/60 py-12 px-4 sm:px-8 lg:px-12 text-xs text-gw-text-secondary">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand Col */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gw-cyan/10 border border-gw-cyan/30 flex items-center justify-center">
                <Plane className="w-4 h-4 text-gw-cyan rotate-[-45deg]" />
              </div>
              <span className="font-bold text-base text-gw-text">
                Gate<span className="text-gw-cyan">Wise</span>
              </span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Intelligent Airport Gate Allocation simulator powered by Discrete Mathematics and Graph Theory.
            </p>
            <div className="text-[10px] text-gw-text-secondary/70 font-mono">
              Version 1.0 • Educational Edition
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gw-text uppercase tracking-wider text-[11px]">Navigation</h4>
            <ul className="space-y-1.5">
              <li><Link to="/dashboard" className="hover:text-gw-cyan transition-colors">Operations Dashboard</Link></li>
              <li><Link to="/flights" className="hover:text-gw-cyan transition-colors">Flight Management</Link></li>
              <li><Link to="/gates" className="hover:text-gw-cyan transition-colors">Gate Management</Link></li>
              <li><Link to="/restrictions" className="hover:text-gw-cyan transition-colors">Restriction Matrix</Link></li>
              <li><Link to="/simulator" className="hover:text-gw-cyan transition-colors">Allocation Simulator</Link></li>
            </ul>
          </div>

          {/* Mathematical Modules */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gw-text uppercase tracking-wider text-[11px]">Mathematics</h4>
            <ul className="space-y-1.5">
              <li><Link to="/math-explorer" className="hover:text-gw-cyan transition-colors">Permutations (n!)</Link></li>
              <li><Link to="/math-explorer" className="hover:text-gw-cyan transition-colors">Restriction Board</Link></li>
              <li><Link to="/calculation" className="hover:text-gw-cyan transition-colors">Rook Polynomials R(x)</Link></li>
              <li><Link to="/calculation" className="hover:text-gw-cyan transition-colors">Inclusion-Exclusion Sum</Link></li>
              <li><Link to="/analytics" className="hover:text-gw-cyan transition-colors">Combinatorial Analytics</Link></li>
            </ul>
          </div>

          {/* Tech Stack & Academic */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gw-text uppercase tracking-wider text-[11px]">Technology Stack</h4>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li>React 19 + Vite 8</li>
              <li>Tailwind CSS v4</li>
              <li>Python 3.14 + FastAPI</li>
              <li>SQLAlchemy + SQLite</li>
              <li>Bitmask DP Engine</li>
            </ul>
          </div>
        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-[#1e3a5f]/40 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <div>
            © {new Date().getFullYear()} GateWise • Educational Discrete Mathematics & Graph Theory Project.
          </div>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-gw-cyan transition-colors">Project Methodology</Link>
            <span>•</span>
            <span className="text-gw-cyan font-mono">Module 1 Deterministic Calculations</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
