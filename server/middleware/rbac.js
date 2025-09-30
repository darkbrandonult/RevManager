// Role-Based Access Control (RBAC) middleware
export const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const rolePermissions = {
            owner: ['all'],
            manager: ['view_dashboard', 'manage_menu', 'manage_orders', 'manage_inventory', 'manage_staff', 'view_reports'],
            chef: ['manage_orders', 'manage_inventory', 'view_menu'],
            server: ['place_orders', 'view_orders', 'view_menu'],
            customer: ['view_menu', 'place_orders']
        };

        const userPermissions = rolePermissions[req.user.role] || [];
        
        if (!userPermissions.includes('all') && !userPermissions.includes(permission)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};
