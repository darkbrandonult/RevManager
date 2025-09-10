import React, { useState, useEffect } from 'react'
import { useDrop } from 'react-dnd'

interface Shift {
  id: number
  date: string
  startTime: string
  endTime: string
  roleRequired: string
  location: string
  notes?: string
  assignments: Assignment[]
}

interface Assignment {
  id: number
  status: string
  assignedAt: string
  user: {
    id: number
    name: string
    email: string
    role: string
  }
}

interface User {
  id: number
  name: string
  email: string
  role: string
}

interface UserAssignmentPanelProps {
  shift: Shift
  onClose: () => void
  onAssignUser?: (shiftId: number, userId: number) => void
  onUpdateStatus: (assignmentId: number, status: string) => void
  currentUser: any
}

const UserAssignmentPanel: React.FC<UserAssignmentPanelProps> = ({
  shift,
  onClose,
  onAssignUser,
  onUpdateStatus,
  currentUser
}) => {
  const [availableUsers, setAvailableUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [showSwapRequest, setShowSwapRequest] = useState(false)
  const [swapMessage, setSwapMessage] = useState('')

  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'user',
    drop: (item: { id: number; type: string }) => {
      if (onAssignUser && item.type === 'user') {
        onAssignUser(shift.id, item.id)
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }))

  useEffect(() => {
    fetchAvailableUsers()
  }, [shift.id])

  const fetchAvailableUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const users = await response.json()
        // Filter users by role compatibility
        const compatibleUsers = users.filter((user: User) => 
          user.role === shift.roleRequired || 
          ['manager', 'owner'].includes(user.role) ||
          (shift.roleRequired === 'server' && ['host', 'bartender'].includes(user.role))
        )
        setAvailableUsers(compatibleUsers)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const requestShiftSwap = async (targetUserId: number) => {
    try {
      const response = await fetch('/api/schedules/swap-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          targetUserId,
          shiftId: shift.id,
          message: swapMessage
        })
      })

      if (response.ok) {
        alert('Swap request sent successfully!')
        setShowSwapRequest(false)
        setSwapMessage('')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to send swap request')
      }
    } catch (error) {
      console.error('Error sending swap request:', error)
    }
  }

  const userAssignment = shift.assignments.find(a => a.user.id === currentUser?.id)
  const canManage = currentUser?.role && ['manager', 'owner'].includes(currentUser.role)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Shift Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Shift Information */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Date</label>
              <p className="text-gray-900">{new Date(shift.date).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Time</label>
              <p className="text-gray-900">{shift.startTime} - {shift.endTime}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Role</label>
              <p className="text-gray-900 capitalize">{shift.roleRequired}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Location</label>
              <p className="text-gray-900">{shift.location}</p>
            </div>
          </div>
          {shift.notes && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">Notes</label>
              <p className="text-gray-900">{shift.notes}</p>
            </div>
          )}
        </div>

        {/* Current Assignments */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Current Assignments</h3>
          {shift.assignments.length > 0 ? (
            <div className="space-y-3">
              {shift.assignments.map(assignment => (
                <div key={assignment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{assignment.user.name}</p>
                    <p className="text-sm text-gray-600">{assignment.user.email}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                      assignment.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      assignment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      assignment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {assignment.status}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    {userAssignment?.id === assignment.id && (
                      <>
                        {assignment.status === 'scheduled' && (
                          <button
                            onClick={() => onUpdateStatus(assignment.id, 'confirmed')}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Confirm
                          </button>
                        )}
                        {['scheduled', 'confirmed'].includes(assignment.status) && (
                          <>
                            <button
                              onClick={() => setShowSwapRequest(true)}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Request Swap
                            </button>
                            <button
                              onClick={() => onUpdateStatus(assignment.id, 'cancelled')}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                      </>
                    )}
                    
                    {canManage && assignment.status === 'confirmed' && (
                      <button
                        onClick={() => onUpdateStatus(assignment.id, 'completed')}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 italic">No assignments yet</p>
          )}
        </div>

        {/* Available Users (for managers) */}
        {canManage && onAssignUser && (
          <div
            ref={drop}
            className={`mb-6 p-4 border-2 border-dashed rounded-lg transition-colors ${
              isOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Available Users</h3>
            <p className="text-sm text-gray-600 mb-3">
              {isOver ? 'Drop user here to assign' : 'Drag users here to assign them to this shift'}
            </p>
            
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {availableUsers
                  .filter(user => !shift.assignments.some(a => a.user.id === user.id))
                  .map(user => (
                    <button
                      key={user.id}
                      onClick={() => onAssignUser(shift.id, user.id)}
                      className="p-2 text-left border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                    >
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-600 capitalize">{user.role}</p>
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Swap Request Modal */}
        {showSwapRequest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">Request Shift Swap</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select user to swap with:
                </label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="">Select a user...</option>
                  {availableUsers
                    .filter(user => user.id !== currentUser?.id)
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role})
                      </option>
                    ))}
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (optional):
                </label>
                <textarea
                  value={swapMessage}
                  onChange={(e) => setSwapMessage(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={3}
                  placeholder="Reason for swap request..."
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSwapRequest(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const select = document.querySelector('select') as HTMLSelectElement
                    if (select?.value) {
                      requestShiftSwap(parseInt(select.value))
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Send Request
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default UserAssignmentPanel
