import { useState, useEffect } from 'react'

interface User {
  id: number
  first_name: string
  last_name: string
  email: string
  role: 'owner' | 'manager' | 'server' | 'kitchen' | 'host'
  hourly_rate: number
  status: 'active' | 'inactive'
  hire_date: string
  phone?: string
  address?: string
}

interface PayrollEntry {
  id: number
  user_id: number
  user_name: string
  role: string
  hours_worked: number
  hourly_rate: number
  tips: number
  deductions: number
  gross_pay: number
  net_pay: number
  pay_period_start: string
  pay_period_end: string
  status: 'pending' | 'paid'
}

interface TimeEntry {
  id: number
  user_id: number
  user_name: string
  clock_in: string
  clock_out?: string
  break_minutes: number
  total_hours: number
  date: string
}

const StaffPayroll = () => {
  const [users, setUsers] = useState<User[]>([])
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'staff' | 'payroll' | 'timesheets'>('staff')
  
  // Modal states
  const [showUserModal, setShowUserModal] = useState(false)
  const [showPayrollModal, setShowPayrollModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  
  // Form states
  const [userForm, setUserForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'server' as User['role'],
    hourly_rate: 15.00,
    phone: '',
    address: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Demo data
      setUsers([
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@restaurant.com',
          role: 'owner',
          hourly_rate: 0,
          status: 'active',
          hire_date: '2023-01-15',
          phone: '(555) 123-4567',
          address: '123 Main St, City, State'
        },
        {
          id: 2,
          first_name: 'Sarah',
          last_name: 'Johnson',
          email: 'sarah@restaurant.com',
          role: 'manager',
          hourly_rate: 25.00,
          status: 'active',
          hire_date: '2023-03-01',
          phone: '(555) 234-5678'
        },
        {
          id: 3,
          first_name: 'Mike',
          last_name: 'Wilson',
          email: 'mike@restaurant.com',
          role: 'server',
          hourly_rate: 15.00,
          status: 'active',
          hire_date: '2023-06-15',
          phone: '(555) 345-6789'
        },
        {
          id: 4,
          first_name: 'Lisa',
          last_name: 'Brown',
          email: 'lisa@restaurant.com',
          role: 'kitchen',
          hourly_rate: 18.00,
          status: 'active',
          hire_date: '2023-04-01',
          phone: '(555) 456-7890'
        },
        {
          id: 5,
          first_name: 'Tom',
          last_name: 'Davis',
          email: 'tom@restaurant.com',
          role: 'host',
          hourly_rate: 14.00,
          status: 'inactive',
          hire_date: '2023-02-01',
          phone: '(555) 567-8901'
        }
      ])

      setPayrollEntries([
        {
          id: 1,
          user_id: 2,
          user_name: 'Sarah Johnson',
          role: 'manager',
          hours_worked: 80,
          hourly_rate: 25.00,
          tips: 0,
          deductions: 200,
          gross_pay: 2000,
          net_pay: 1800,
          pay_period_start: '2025-08-16',
          pay_period_end: '2025-08-31',
          status: 'paid'
        },
        {
          id: 2,
          user_id: 3,
          user_name: 'Mike Wilson',
          role: 'server',
          hours_worked: 72,
          hourly_rate: 15.00,
          tips: 850,
          deductions: 180,
          gross_pay: 1080,
          net_pay: 1750,
          pay_period_start: '2025-08-16',
          pay_period_end: '2025-08-31',
          status: 'paid'
        },
        {
          id: 3,
          user_id: 4,
          user_name: 'Lisa Brown',
          role: 'kitchen',
          hours_worked: 75,
          hourly_rate: 18.00,
          tips: 120,
          deductions: 190,
          gross_pay: 1350,
          net_pay: 1280,
          pay_period_start: '2025-08-16',
          pay_period_end: '2025-08-31',
          status: 'pending'
        }
      ])

      setTimeEntries([
        {
          id: 1,
          user_id: 3,
          user_name: 'Mike Wilson',
          clock_in: '2025-09-04T09:00:00',
          clock_out: '2025-09-04T17:30:00',
          break_minutes: 30,
          total_hours: 8.0,
          date: '2025-09-04'
        },
        {
          id: 2,
          user_id: 4,
          user_name: 'Lisa Brown',
          clock_in: '2025-09-04T08:00:00',
          clock_out: '2025-09-04T16:00:00',
          break_minutes: 45,
          total_hours: 7.25,
          date: '2025-09-04'
        },
        {
          id: 3,
          user_id: 2,
          user_name: 'Sarah Johnson',
          clock_in: '2025-09-04T10:00:00',
          break_minutes: 0,
          total_hours: 0,
          date: '2025-09-04'
        }
      ])

    } catch (err) {
      setError('Failed to load staff data')
    } finally {
      setLoading(false)
    }
  }

  const openUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user)
      setUserForm({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        hourly_rate: user.hourly_rate,
        phone: user.phone || '',
        address: user.address || ''
      })
    } else {
      setEditingUser(null)
      setUserForm({
        first_name: '',
        last_name: '',
        email: '',
        role: 'server',
        hourly_rate: 15.00,
        phone: '',
        address: ''
      })
    }
    setShowUserModal(true)
  }

  const saveUser = () => {
    if (editingUser) {
      setUsers(prev => prev.map(user => 
        user.id === editingUser.id 
          ? { ...user, ...userForm }
          : user
      ))
    } else {
      const newUser: User = {
        id: Date.now(),
        ...userForm,
        status: 'active',
        hire_date: new Date().toISOString().split('T')[0]
      }
      setUsers(prev => [...prev, newUser])
    }
    setShowUserModal(false)
  }

  const deleteUser = (userId: number) => {
    if (window.confirm('Are you sure you want to remove this staff member?')) {
      setUsers(prev => prev.filter(user => user.id !== userId))
    }
  }

  const generatePayroll = () => {
    const newPayrollEntries: PayrollEntry[] = users
      .filter(user => user.status === 'active' && user.role !== 'owner')
      .map(user => {
        const timeWorked = timeEntries
          .filter(entry => entry.user_id === user.id)
          .reduce((total, entry) => total + entry.total_hours, 0)
        
        const grossPay = timeWorked * user.hourly_rate
        const tips = user.role === 'server' ? Math.random() * 500 + 200 : Math.random() * 100
        const deductions = grossPay * 0.15 // Simplified tax calculation
        const netPay = grossPay + tips - deductions

        return {
          id: Date.now() + user.id,
          user_id: user.id,
          user_name: `${user.first_name} ${user.last_name}`,
          role: user.role,
          hours_worked: timeWorked,
          hourly_rate: user.hourly_rate,
          tips: Math.round(tips * 100) / 100,
          deductions: Math.round(deductions * 100) / 100,
          gross_pay: Math.round(grossPay * 100) / 100,
          net_pay: Math.round(netPay * 100) / 100,
          pay_period_start: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          pay_period_end: new Date().toISOString().split('T')[0],
          status: 'pending' as const
        }
      })

    setPayrollEntries(prev => [...prev, ...newPayrollEntries])
    alert('Payroll generated successfully!')
  }

  const markPayrollPaid = (entryId: number) => {
    setPayrollEntries(prev => prev.map(entry => 
      entry.id === entryId ? { ...entry, status: 'paid' } : entry
    ))
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'server': return 'bg-green-100 text-green-800'
      case 'kitchen': return 'bg-orange-100 text-orange-800'
      case 'host': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading staff management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">👥 Staff & Payroll Management</h1>
            <p className="mt-2 text-gray-600">
              Manage staff, roles, and payroll processing
            </p>
          </div>
          <div className="mt-4 lg:mt-0 flex gap-3">
            <button
              onClick={() => openUserModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              + Add Staff Member
            </button>
            <button
              onClick={generatePayroll}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Generate Payroll
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'staff', label: '👥 Staff Members', count: users.length },
                { key: 'payroll', label: '💰 Payroll', count: payrollEntries.filter(e => e.status === 'pending').length },
                { key: 'timesheets', label: '⏰ Time Tracking', count: timeEntries.filter(e => !e.clock_out).length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Staff Members Tab */}
        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {users.map((user) => (
                <div key={user.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {user.first_name} {user.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Hourly Rate:</span>
                      <span className="font-medium">
                        {user.hourly_rate > 0 ? `$${user.hourly_rate.toFixed(2)}` : 'Salary'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className={`font-medium ${user.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                        {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Hire Date:</span>
                      <span className="font-medium">
                        {new Date(user.hire_date).toLocaleDateString()}
                      </span>
                    </div>
                    {user.phone && (
                      <div className="flex justify-between">
                        <span>Phone:</span>
                        <span className="font-medium">{user.phone}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => openUserModal(user)}
                      className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                    {user.role !== 'owner' && (
                      <button
                        onClick={() => deleteUser(user.id)}
                        className="flex-1 bg-red-50 text-red-600 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-100 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Payroll Tab */}
        {activeTab === 'payroll' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Payroll Entries</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gross Pay
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tips
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net Pay
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
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
                    {payrollEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{entry.user_name}</div>
                          <div className="text-sm text-gray-500">{entry.role}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.hours_worked.toFixed(1)}h @ ${entry.hourly_rate.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${entry.gross_pay.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${entry.tips.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ${entry.net_pay.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(entry.pay_period_start).toLocaleDateString()} - {new Date(entry.pay_period_end).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            entry.status === 'paid' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {entry.status === 'pending' && (
                            <button
                              onClick={() => markPayrollPaid(entry.id)}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Time Tracking Tab */}
        {activeTab === 'timesheets' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Today's Time Entries</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clock In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Clock Out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Break Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {timeEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{entry.user_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(entry.clock_in).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.break_minutes} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.total_hours.toFixed(1)}h
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            entry.clock_out 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {entry.clock_out ? 'Completed' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingUser ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      value={userForm.first_name}
                      onChange={(e) => setUserForm({...userForm, first_name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      value={userForm.last_name}
                      onChange={(e) => setUserForm({...userForm, last_name: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({...userForm, role: e.target.value as User['role']})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="server">Server</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="host">Host</option>
                      <option value="manager">Manager</option>
                      <option value="owner">Owner</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hourly Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={userForm.hourly_rate}
                      onChange={(e) => setUserForm({...userForm, hourly_rate: parseFloat(e.target.value)})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <textarea
                    value={userForm.address}
                    onChange={(e) => setUserForm({...userForm, address: e.target.value})}
                    rows={2}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveUser}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StaffPayroll
