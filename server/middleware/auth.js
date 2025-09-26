import jwt from 'jsonwebtoken'
import { pool } from '../database/connection.js'

// Base authentication middleware
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access token required' })
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
      
      // Fetch current user data from database to ensure account is still active
      const userResult = await pool.query(
        'SELECT id, email, first_name, last_name, role, is_active FROM users WHERE id = $1',
        [decoded.userId]
      )

      if (userResult.rows.length === 0) {
        return res.status(401).json({ error: 'User not found' })
      }

      const user = userResult.rows[0]

      if (!user.is_active) {
        return res.status(401).json({ error: 'Account deactivated' })
      }

      // Attach user info to request object
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active
      }

      next()
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid or expired token' })
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return res.status(500).json({ error: 'Authentication service error' })
  }
}

// Role hierarchy definition
const ROLE_HIERARCHY = {
  customer: 0,
  server: 1,
  chef: 2,
  manager: 3,
  owner: 4
}

// Check if user has minimum required role level
const hasMinimumRole = (userRole, requiredRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// Check if user has one of the allowed roles
const hasAllowedRole = (userRole, allowedRoles) => {
  return allowedRoles.includes(userRole)
}

// Generic role-based middleware factory
export const requireRoles = (allowedRoles, options = {}) => {
  return async (req, res, next) => {
    try {
      // First ensure user is authenticated
      await requireAuth(req, res, () => {})
      
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const userRole = req.user.role
      const hasAccess = Array.isArray(allowedRoles) 
        ? hasAllowedRole(userRole, allowedRoles)
        : hasMinimumRole(userRole, allowedRoles)

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: userRole
        })
      }

      next()
    } catch (error) {
      console.error('Role middleware error:', error)
      return res.status(500).json({ error: 'Authorization service error' })
    }
  }
}

// Specific role middleware functions
export const requireCustomer = requireRoles(['customer', 'server', 'chef', 'manager', 'owner'])
export const requireServer = requireRoles(['server', 'chef', 'manager', 'owner'])
export const requireChef = requireRoles(['chef', 'manager', 'owner'])
export const requireManager = requireRoles(['manager', 'owner'])
export const requireOwner = requireRoles(['owner'])

// Kitchen staff (chef or higher)
export const requireKitchenStaff = requireRoles(['chef', 'manager', 'owner'])

// Management staff (manager or owner)
export const requireManagement = requireRoles(['manager', 'owner'])

// Any staff member (not customer)
export const requireStaff = requireRoles(['server', 'chef', 'manager', 'owner'])

// Custom role combinations
export const requireInventoryAccess = requireRoles(['chef', 'manager', 'owner'])
export const requireOrderManagement = requireRoles(['server', 'chef', 'manager', 'owner'])
export const requireMenuManagement = requireRoles(['chef', 'manager', 'owner'])
export const requireUserManagement = requireRoles(['manager', 'owner'])
export const requireReportsAccess = requireRoles(['manager', 'owner'])

// Special middleware for resource ownership (e.g., users can edit their own orders)
export const requireOwnershipOrRole = (allowedRoles, resourceField = 'user_id') => {
  return async (req, res, next) => {
    try {
      // First ensure user is authenticated
      await requireAuth(req, res, () => {})
      
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' })
      }

      const userRole = req.user.role
      const userId = req.user.id

      // Check if user has sufficient role
      const hasRoleAccess = hasAllowedRole(userRole, allowedRoles)
      
      if (hasRoleAccess) {
        return next()
      }

      // If not sufficient role, check resource ownership
      const resourceId = req.params.id || req.params.orderId || req.params.userId
      
      if (!resourceId) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // This would need to be customized based on the specific resource
      // For now, we'll allow access if the user ID matches
      if (resourceField === 'user_id' && parseInt(resourceId) === userId) {
        return next()
      }

      return res.status(403).json({ 
        error: 'Access denied - insufficient permissions or not resource owner' 
      })

    } catch (error) {
      console.error('Ownership middleware error:', error)
      return res.status(500).json({ error: 'Authorization service error' })
    }
  }
}

// Middleware to check if user can access specific restaurant data
export const requireRestaurantAccess = async (req, res, next) => {
  try {
    await requireAuth(req, res, () => {})
    
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' })
    }

    // In a multi-restaurant system, you would check restaurant_id here
    // For single restaurant, all authenticated users have access
    next()
  } catch (error) {
    console.error('Restaurant access middleware error:', error)
    return res.status(500).json({ error: 'Authorization service error' })
  }
}

// Audit logging middleware (for sensitive operations)
export const auditLog = (action) => {
  return async (req, res, next) => {
    try {
      // Log the action attempt
      const logData = {
        user_id: req.user?.id,
        action,
        endpoint: req.originalUrl,
        method: req.method,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        timestamp: new Date().toISOString()
      }

      console.log('AUDIT LOG:', JSON.stringify(logData, null, 2))
      
      // In production, you'd save this to an audit_logs table
      // await pool.query('INSERT INTO audit_logs (...) VALUES (...)', [...])

      next()
    } catch (error) {
      console.error('Audit logging error:', error)
      next() // Don't block the request if logging fails
    }
  }
}
