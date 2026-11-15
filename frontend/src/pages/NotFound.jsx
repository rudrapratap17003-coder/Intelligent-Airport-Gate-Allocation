import React from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Home, ArrowLeft } from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-gw-bg text-gw-text flex items-center justify-center p-6">
      <Card className="max-w-md w-full text-center p-8 space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gw-error/10 border border-gw-error/30 flex items-center justify-center text-gw-error">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-gw-text">Route Not Found</h2>
        <p className="text-sm text-gw-text-secondary">
          The requested flight path or gate allocation view does not exist in the GateWise navigation mesh.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link to="/">
            <Button variant="secondary" icon={ArrowLeft}>
              Landing Page
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button icon={Home}>
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default NotFound
