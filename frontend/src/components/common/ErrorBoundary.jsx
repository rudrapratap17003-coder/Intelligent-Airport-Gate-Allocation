import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('GateWise BLR ErrorBoundary caught error:', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-6 rounded-xl bg-[#121826] border border-[#222E42] space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#1E2638] border border-[#222E42] mx-auto flex items-center justify-center">
              <span className="text-xl font-bold text-white">!</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Module Loading Error</h2>
              <p className="text-xs text-[#A3A3A3] mt-1.5">
                A component failed to load or encountered a runtime error. This can happen following an application update.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg border border-[#222E42] text-white hover:bg-[#1E2638] transition-colors cursor-pointer"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg bg-white text-black hover:bg-[#E5E5E5] transition-colors cursor-pointer"
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
