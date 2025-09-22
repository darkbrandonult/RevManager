import React, { useState, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Calendar, momentLocalizer } from 'react-big-calendar'
import moment from 'moment'
import { useAuth } from '../contexts/AuthContext'
import { useSocket } from '../hooks/useSocket'
import ShiftCard from './ShiftCard'
import UserAssignmentPanel from './UserAssignmentPanel'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const localizer = momentLocalizer(moment)

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

interface CalendarEvent {
  id: number
  title: string
  start: Date
  end: Date
  resource: Shift
}

const SchedulePlanner: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [dateRange, setDateRange] = useState({
    start: moment().startOf('week').format('YYYY-MM-DD'),
    end: moment().endOf('week').add(1, 'week').format('YYYY-MM-DD')
  })
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newShift, setNewShift] = useState({
    date: '',
    startTime: '',
    endTime: '',
    roleRequired: 'server',
    location: 'main',
    notes: ''
  })

  const { user } = useAuth()
  const socket = useSocket()

  const canManageSchedules = user?.role && ['manager', 'owner'].includes(user.role)

  useEffect(() => {
    fetchShifts()
  }, [dateRange])

  useEffect(() => {
    if (socket) {
      socket.on('new-schedule', handleNewSchedule)
      socket.on('shift-assignment', handleShiftAssignment)
      socket.on('shift-status-update', handleShiftStatusUpdate)
      socket.on('shift-swap-completed', handleShiftSwapCompleted)

      return () => {
        socket.off('new-schedule', handleNewSchedule)
        socket.off('shift-assignment', handleShiftAssignment)
        socket.off('shift-status-update', handleShiftStatusUpdate)
        socket.off('shift-swap-completed', handleShiftSwapCompleted)
      }
    }
  }, [socket])

  const fetchShifts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start,
        endDate: dateRange.end
      })
      
      const response = await fetch(`/api/schedules?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setShifts(data)
      } else {
        console.error('Failed to fetch shifts')
      }
    } catch (error) {
      console.error('Error fetching shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewSchedule = (shift: Shift) => {
    setShifts(prev => [...prev, shift])
  }

  const handleShiftAssignment = (data: { shiftId: number; assignment: Assignment }) => {
    setShifts(prev => prev.map(shift => 
      shift.id === data.shiftId 
        ? { ...shift, assignments: [...shift.assignments, data.assignment] }
        : shift
    ))
  }

  const handleShiftStatusUpdate = (data: { shiftId: number; assignmentId: number; status: string }) => {
    setShifts(prev => prev.map(shift => 
      shift.id === data.shiftId 
        ? {
            ...shift,
            assignments: shift.assignments.map(assignment =>
              assignment.id === data.assignmentId
                ? { ...assignment, status: data.status }
                : assignment
            )
          }
        : shift
    ))
  }

  const handleShiftSwapCompleted = (data: { shiftId: number; originalUserId: number; newUserId: number }) => {
    setShifts(prev => prev.map(shift => 
      shift.id === data.shiftId 
        ? {
            ...shift,
            assignments: shift.assignments.map(assignment =>
              assignment.user.id === data.originalUserId
                ? { ...assignment, user: { ...assignment.user, id: data.newUserId } }
                : assignment
            )
          }
        : shift
    ))
  }

  const createShift = async () => {
    try {
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newShift)
      })

      if (response.ok) {
        const shift = await response.json()
        setShifts(prev => [...prev, shift])
        setShowCreateModal(false)
        setNewShift({
          date: '',
          startTime: '',
          endTime: '',
          roleRequired: 'server',
          location: 'main',
          notes: ''
        })
      } else {
        console.error('Failed to create shift')
      }
    } catch (error) {
      console.error('Error creating shift:', error)
    }
  }

  const assignUserToShift = async (shiftId: number, userId: number) => {
    try {
      const response = await fetch(`/api/schedules/${shiftId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        const assignment = await response.json()
        setShifts(prev => prev.map(shift => 
          shift.id === shiftId 
            ? { ...shift, assignments: [...shift.assignments, assignment] }
            : shift
        ))
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to assign user to shift')
      }
    } catch (error) {
      console.error('Error assigning user to shift:', error)
    }
  }

  const updateAssignmentStatus = async (assignmentId: number, status: string) => {
    try {
      const response = await fetch(`/api/schedules/assignments/${assignmentId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      })

      if (response.ok) {
        // Update handled by socket event
      } else {
        console.error('Failed to update assignment status')
      }
    } catch (error) {
      console.error('Error updating assignment status:', error)
    }
  }

  // Convert shifts to calendar events
  const calendarEvents: CalendarEvent[] = shifts.map(shift => ({
    id: shift.id,
    title: `${shift.roleRequired} - ${shift.assignments.length > 0 ? shift.assignments[0].user.name : 'Unassigned'}`,
    start: moment(`${shift.date} ${shift.startTime}`).toDate(),
    end: moment(`${shift.date} ${shift.endTime}`).toDate(),
    resource: shift
  }))

  const eventStyleGetter = (event: CalendarEvent) => {
    const shift = event.resource
    let backgroundColor = '#3174ad'
    
    if (shift.assignments.length === 0) {
      backgroundColor = '#dc3545' // Red for unassigned
    } else if (shift.assignments.some(a => a.status === 'confirmed')) {
      backgroundColor = '#28a745' // Green for confirmed
    } else if (shift.assignments.some(a => a.status === 'cancelled')) {
      backgroundColor = '#ffc107' // Yellow for cancelled
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    }
  }

  const roles = ['server', 'chef', 'manager', 'host', 'bartender', 'busser']

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Staff Schedule</h1>
            <p className="text-gray-600 mt-2">Manage shifts and assignments</p>
          </div>
          
          <div className="flex space-x-4">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setView('calendar')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  view === 'calendar' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Calendar
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  view === 'list' 
                    ? 'bg-white shadow text-blue-600' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List
              </button>
            </div>
            
            {canManageSchedules && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Shift
              </button>
            )}
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6 flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {view === 'calendar' ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" style={{ height: '600px' }}>
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  style={{ height: '100%' }}
                  onSelectEvent={(event) => setSelectedShift(event.resource)}
                  eventPropGetter={eventStyleGetter}
                  views={['week', 'day']}
                  defaultView="week"
                  step={30}
                  timeslots={2}
                  min={moment().hour(6).minute(0).toDate()}
                  max={moment().hour(23).minute(59).toDate()}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {shifts.map(shift => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    onSelect={() => setSelectedShift(shift)}
                    onAssignUser={canManageSchedules ? assignUserToShift : undefined}
                    onUpdateStatus={updateAssignmentStatus}
                    currentUser={user}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Create Shift Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Create New Shift</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={newShift.date}
                    onChange={(e) => setNewShift(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={newShift.startTime}
                      onChange={(e) => setNewShift(prev => ({ ...prev, startTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input
                      type="time"
                      value={newShift.endTime}
                      onChange={(e) => setNewShift(prev => ({ ...prev, endTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role Required</label>
                  <select
                    value={newShift.roleRequired}
                    onChange={(e) => setNewShift(prev => ({ ...prev, roleRequired: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    {roles.map(role => (
                      <option key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={newShift.location}
                    onChange={(e) => setNewShift(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., main, kitchen, bar"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={newShift.notes}
                    onChange={(e) => setNewShift(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                    placeholder="Optional notes about the shift"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createShift}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Shift
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Shift Details Panel */}
        {selectedShift && (
          <UserAssignmentPanel
            shift={selectedShift}
            onClose={() => setSelectedShift(null)}
            onAssignUser={canManageSchedules ? assignUserToShift : undefined}
            onUpdateStatus={updateAssignmentStatus}
            currentUser={user}
          />
        )}
      </div>
    </DndProvider>
  )
}

export default SchedulePlanner
