import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import SimplePublicMenu from './components/SimplePublicMenu'
import SimpleLogin from './components/SimpleLogin'
import SimpleDashboard from './components/SimpleDashboard'
import SimpleKitchen from './components/SimpleKitchen'
import SimpleMenuManagement from './components/SimpleMenuManagement'
import SimpleReports from './components/SimpleReports'
import StaffPayroll from './components/StaffPayroll'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<SimplePublicMenu />} />
          <Route path="/menu" element={<SimplePublicMenu />} />
          <Route path="/login" element={<SimpleLogin />} />
          <Route path="/dashboard" element={<SimpleDashboard />} />
          <Route path="/kitchen" element={<SimpleKitchen />} />
          <Route path="/menu-management" element={<SimpleMenuManagement />} />
          <Route path="/reports" element={<SimpleReports />} />
          <Route path="/staff-payroll" element={<StaffPayroll />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
