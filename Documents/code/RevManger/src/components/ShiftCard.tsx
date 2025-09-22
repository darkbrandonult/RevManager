import React from 'react'
import { useDrag } from 'react-dnd'
import moment from 'moment'

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

interface ShiftCardProps {
  shift: Shift
  onSelect: () => void
  onAssignUser?: (shiftId: number, userId: number) => void
  onUpdateStatus: (assignmentId: number, status: string) => void
  currentUser: any
}

const ShiftCard: React.FC<ShiftCardProps> = ({ 
  shift, 
  onSelect, 
  onAssignUser, 
  onUpdateStatus, 
  currentUser 
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'shift',
    item: { id: shift.id, type: 'shift' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'no_show': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'chef': return 'bg-red-500'
      case 'server': return 'bg-blue-500'
      case 'manager': return 'bg-purple-500'
      case 'host': return 'bg-green-500'
      case 'bartender': return 'bg-amber-500'
      case 'busser': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const isAssigned = shift.assignments.length > 0
  const userAssignment = shift.assignments.find(a => a.user.id === currentUser?.id)

  return (
    <div
      ref={drag}
      onClick={onSelect}
      className={`bg-white rounded-lg shadow border border-gray-200 p-4 cursor-pointer transition-all hover:shadow-md ${
        isDragging ? 'opacity-50' : ''
      } ${!isAssigned ? 'border-l-4 border-l-red-400' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${getRoleColor(shift.roleRequired)}`}></div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {shift.roleRequired.charAt(0).toUpperCase() + shift.roleRequired.slice(1)}
            </h3>
            <p className="text-sm text-gray-600">{shift.location}</p>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            {moment(shift.date).format('MMM DD, YYYY')}
          </p>
          <p className="text-sm text-gray-600">
            {moment(shift.startTime, 'HH:mm').format('h:mm A')} - {moment(shift.endTime, 'HH:mm').format('h:mm A')}
          </p>
        </div>
      </div>

      {shift.notes && (
        <p className="text-sm text-gray-600 mb-3 italic">{shift.notes}</p>
      )}

      <div className="space-y-2">
        {shift.assignments.length > 0 ? (
          shift.assignments.map(assignment => (
            <div key={assignment.id} className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">
                  {assignment.user.name}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                  {assignment.status}
                </span>
              </div>
              
              {userAssignment?.id === assignment.id && (
                <div className="flex space-x-1">
                  {assignment.status === 'scheduled' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateStatus(assignment.id, 'confirmed')
                      }}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  )}
                  {['scheduled', 'confirmed'].includes(assignment.status) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateStatus(assignment.id, 'cancelled')
                      }}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex justify-between items-center">
            <span className="text-sm text-red-600 font-medium">Unassigned</span>
            {onAssignUser && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  // This would open a user selection modal
                  // For now, we'll just show a placeholder
                  alert('User assignment functionality would go here')
                }}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Assign
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ShiftCard
