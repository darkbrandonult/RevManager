import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../hooks/useSocket'

interface TipPayout {
  id: number
  total_amount: number
  hours_worked: number
  role: string
  percentage_share: number
  shift_date: string
  pool_total: number
  pool_status: string
  status: string
  calculation_details: any
}

interface TipSummary {
  totalPayouts: number
  totalAmount: number
  avgAmount: number
  totalHours: number
  avgHourlyTips: number
}

const TipTracker: React.FC = () => {
  const [payouts, setPayouts] = useState<TipPayout[]>([])
  const [summary, setSummary] = useState<TipSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [disputes, setDisputes] = useState([])
  const [showDisputeModal, setShowDisputeModal] = useState(false)
  const [selectedPayout, setSelectedPayout] = useState<TipPayout | null>(null)
  const [disputeReason, setDisputeReason] = useState('')

  const { user } = useAuth()
  const socket = useSocket()

  useEffect(() => {
    fetchTipData()
  }, [dateRange])

  useEffect(() => {
    if (socket) {
      socket.on('tip-pool-calculated', handleTipPoolCalculated)
      socket.on('tip-pool-finalized', handleTipPoolFinalized)

      return () => {
        socket.off('tip-pool-calculated', handleTipPoolCalculated)
        socket.off('tip-pool-finalized', handleTipPoolFinalized)
      }
    }
  }, [socket])

  const fetchTipData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      })

      const response = await fetch(`/api/tips/my-tips?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setPayouts(data.payouts)
        setSummary(data.summary)
      } else {
        console.error('Failed to fetch tip data')
      }
    } catch (error) {
      console.error('Error fetching tip data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDisputes = async () => {
    try {
      const response = await fetch('/api/tips/disputes', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDisputes(data)
      }
    } catch (error) {
      console.error('Error fetching disputes:', error)
    }
  }

  const handleTipPoolCalculated = (data: any) => {
    // Refresh data when new tip pool is calculated
    fetchTipData()
  }

  const handleTipPoolFinalized = (data: any) => {
    // Refresh data when tip pool is finalized
    fetchTipData()
  }

  const submitDispute = async () => {
    if (!selectedPayout || !disputeReason.trim()) {
      return
    }

    try {
      const response = await fetch('/api/tips/disputes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          payoutId: selectedPayout.id,
          reason: disputeReason
        })
      })

      if (response.ok) {
        setShowDisputeModal(false)
        setSelectedPayout(null)
        setDisputeReason('')
        fetchDisputes()
        alert('Dispute submitted successfully')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to submit dispute')
      }
    } catch (error) {
      console.error('Error submitting dispute:', error)
      alert('Failed to submit dispute')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'paid': return 'text-blue-600 bg-blue-100'
      case 'disputed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-soft border-b border-slate-200">
        <div className="container mx-auto py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
                My Tips
              </h1>
              <p className="text-slate-600 mt-1">
                Track your tip earnings and payouts
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-6 sm:py-8">
        {/* Date Range Selector */}
        <div className="bg-white rounded-2xl shadow-soft border border-slate-200 p-6 mb-6 sm:mb-8">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Filter by Date Range</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="form-input"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Tips</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {formatCurrency(summary.totalAmount)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-success-500 to-success-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl">💰</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 mb-1">Avg Per Shift</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {formatCurrency(summary.avgAmount)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl">📊</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 mb-1">Total Hours</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {summary.totalHours.toFixed(1)}h
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl">⏰</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="group bg-white rounded-2xl shadow-soft border border-slate-200 p-6 hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-600 mb-1">Per Hour</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                    {formatCurrency(summary.avgHourlyTips)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-xl">⚡</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}      {/* Payouts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tip History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hours
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pool Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Share %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payout.shift_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(payout.total_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payout.hours_worked ? `${payout.hours_worked}h` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(payout.pool_total)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payout.percentage_share ? `${payout.percentage_share.toFixed(1)}%` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {payout.status === 'approved' && (
                      <button
                        onClick={() => {
                          setSelectedPayout(payout)
                          setShowDisputeModal(true)
                          fetchDisputes()
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Dispute
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {payouts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No tip payouts found for the selected date range.</p>
            </div>
          )}
        </div>
      </div>

      {/* Dispute Modal */}
      {showDisputeModal && selectedPayout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Dispute Tip Payout</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Disputing payout of {formatCurrency(selectedPayout.total_amount)} 
                from {new Date(selectedPayout.shift_date).toLocaleDateString()}
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for dispute:
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                rows={4}
                placeholder="Please explain why you believe this payout is incorrect..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDisputeModal(false)
                  setSelectedPayout(null)
                  setDisputeReason('')
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={submitDispute}
                disabled={!disputeReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TipTracker
