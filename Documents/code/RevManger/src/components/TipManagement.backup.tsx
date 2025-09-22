import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../hooks/useSocket'

interface TipPool {
  id: number
  shift_date: string
  total_tips: number
  total_orders: number
  status: string
  rule_name: string
  payout_count: number
  total_distributed: number
  finalized_by_name?: string
  calculated_at?: string
  distributed_at?: string
}

interface DistributionRule {
  id: number
  name: string
  description: string
  rules: any
  is_active: boolean
  created_by_name: string
}

interface OrderClosingData {
  orderId: number
  tipAmount: number
  paymentMethod: string
}

const TipManagement: React.FC = () => {
  const [tipPools, setTipPools] = useState<TipPool[]>([])
  const [distributionRules, setDistributionRules] = useState<DistributionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showCalculateModal, setShowCalculateModal] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [showOrderCloseModal, setShowOrderCloseModal] = useState(false)
  const [orderClosingData, setOrderClosingData] = useState<OrderClosingData>({
    orderId: 0,
    tipAmount: 0,
    paymentMethod: 'cash'
  })
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null)
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    rules: {
      roles: {
        server: { method: 'hours_weighted', multiplier: 1.2, individualMethod: 'hours_based' },
        chef: { method: 'hours_weighted', multiplier: 1.0, individualMethod: 'hours_based' },
        host: { method: 'hours_weighted', multiplier: 0.8, individualMethod: 'hours_based' },
        manager: { method: 'percentage', percentage: 5, individualMethod: 'equal' }
      },
      default: { method: 'hours_weighted', multiplier: 1.0 }
    }
  })

  const { user } = useAuth()
  const socket = useSocket()

  const canManageTips = user?.role && ['manager', 'owner'].includes(user.role)

  useEffect(() => {
    if (canManageTips) {
      fetchTipPools()
      fetchDistributionRules()
    }
  }, [canManageTips])

  useEffect(() => {
    if (socket) {
      socket.on('order-closed', handleOrderClosed)
      socket.on('tip-dispute-created', handleTipDispute)

      return () => {
        socket.off('order-closed', handleOrderClosed)
        socket.off('tip-dispute-created', handleTipDispute)
      }
    }
  }, [socket])

  const fetchTipPools = async () => {
    try {
      const response = await fetch('/api/tips/tip-pools', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setTipPools(data)
      }
    } catch (error) {
      console.error('Error fetching tip pools:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDistributionRules = async () => {
    try {
      const response = await fetch('/api/tips/distribution-rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setDistributionRules(data)
        if (data.length > 0 && !selectedRuleId) {
          setSelectedRuleId(data[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching distribution rules:', error)
    }
  }

  const handleOrderClosed = (data: any) => {
    // Refresh tip pools when orders are closed
    fetchTipPools()
  }

  const handleTipDispute = (data: any) => {
    alert(`New tip dispute from ${data.userName}: ${data.reason}`)
  }

  const calculateTipPool = async () => {
    if (!selectedRuleId) {
      alert('Please select a distribution rule')
      return
    }

    try {
      const response = await fetch('/api/tips/tip-pools/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          shiftDate: selectedDate,
          distributionRuleId: selectedRuleId
        })
      })

      if (response.ok) {
        const result = await response.json()
        setShowCalculateModal(false)
        fetchTipPools()
        alert(`Tip pool calculated successfully! Total: $${result.summary.totalTips.toFixed(2)} distributed among ${result.summary.totalStaff} staff members.`)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to calculate tip pool')
      }
    } catch (error) {
      console.error('Error calculating tip pool:', error)
      alert('Failed to calculate tip pool')
    }
  }

  const finalizeTipPool = async (tipPoolId: number) => {
    if (!confirm('Are you sure you want to finalize this tip pool? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/tips/tip-pools/${tipPoolId}/finalize`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        fetchTipPools()
        alert('Tip pool finalized successfully!')
      } else {
        alert('Failed to finalize tip pool')
      }
    } catch (error) {
      console.error('Error finalizing tip pool:', error)
      alert('Failed to finalize tip pool')
    }
  }

  const createDistributionRule = async () => {
    try {
      const response = await fetch('/api/tips/distribution-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newRule)
      })

      if (response.ok) {
        setShowRuleModal(false)
        fetchDistributionRules()
        setNewRule({
          name: '',
          description: '',
          rules: {
            roles: {
              server: { method: 'hours_weighted', multiplier: 1.2, individualMethod: 'hours_based' },
              chef: { method: 'hours_weighted', multiplier: 1.0, individualMethod: 'hours_based' },
              host: { method: 'hours_weighted', multiplier: 0.8, individualMethod: 'hours_based' },
              manager: { method: 'percentage', percentage: 5, individualMethod: 'equal' }
            },
            default: { method: 'hours_weighted', multiplier: 1.0 }
          }
        })
        alert('Distribution rule created successfully!')
      } else {
        alert('Failed to create distribution rule')
      }
    } catch (error) {
      console.error('Error creating distribution rule:', error)
      alert('Failed to create distribution rule')
    }
  }

  const closeOrderWithTip = async () => {
    try {
      const response = await fetch(`/api/orders/${orderClosingData.orderId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          tipAmount: orderClosingData.tipAmount,
          paymentMethod: orderClosingData.paymentMethod,
          serverId: user?.id
        })
      })

      if (response.ok) {
        setShowOrderCloseModal(false)
        setOrderClosingData({ orderId: 0, tipAmount: 0, paymentMethod: 'cash' })
        alert('Order closed successfully!')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to close order')
      }
    } catch (error) {
      console.error('Error closing order:', error)
      alert('Failed to close order')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'calculated': return 'text-blue-600 bg-blue-100'
      case 'finalized': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (!canManageTips) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">You don't have permission to access tip management.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tip Management</h1>
          <p className="text-gray-600 mt-2">Manage tip pools and distribution</p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowOrderCloseModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Close Order
          </button>
          <button
            onClick={() => setShowCalculateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Calculate Tips
          </button>
          <button
            onClick={() => setShowRuleModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            New Rule
          </button>
        </div>
      </div>

      {/* Tip Pools Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Tip Pools</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Tips
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Staff
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rule
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
              {tipPools.map((pool) => (
                <tr key={pool.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(pool.shift_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(pool.total_tips)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pool.total_orders}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pool.payout_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {pool.rule_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pool.status)}`}>
                      {pool.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {pool.status === 'calculated' && (
                      <button
                        onClick={() => finalizeTipPool(pool.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Finalize
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tipPools.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No tip pools found.</p>
            </div>
          )}
        </div>
      </div>

      {/* Calculate Tip Pool Modal */}
      {showCalculateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Calculate Tip Pool</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Distribution Rule</label>
                <select
                  value={selectedRuleId || ''}
                  onChange={(e) => setSelectedRuleId(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Select a rule...</option>
                  {distributionRules.map(rule => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCalculateModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={calculateTipPool}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Calculate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Order Modal */}
      {showOrderCloseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Close Order with Tip</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order ID</label>
                <input
                  type="number"
                  value={orderClosingData.orderId}
                  onChange={(e) => setOrderClosingData(prev => ({ ...prev, orderId: parseInt(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter order ID"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tip Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={orderClosingData.tipAmount}
                  onChange={(e) => setOrderClosingData(prev => ({ ...prev, tipAmount: parseFloat(e.target.value) }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={orderClosingData.paymentMethod}
                  onChange={(e) => setOrderClosingData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Credit Card</option>
                  <option value="digital">Digital Payment</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowOrderCloseModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={closeOrderWithTip}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Close Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TipManagement
