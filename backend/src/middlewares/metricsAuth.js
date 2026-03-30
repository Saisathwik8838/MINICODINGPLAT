import { env } from '../config/env.js';

/**
 * Middleware to protect metrics endpoint
 * Use header-based authentication for Prometheus scraping
 */
export const metricsAuth = (req, res, next) => {
    // Allow health check without auth (used by load balancers)
    if (req.path === '/health') {
        return next();
    }
    
    // For metrics endpoint, check header
    const authHeader = req.headers['x-metrics-secret'];
    const expectedSecret = process.env.METRICS_SECRET;
    
    if (!expectedSecret) {
        // If not configured, allow only localhost
        const clientIp = req.ip || req.connection.remoteAddress;
        if (!['127.0.0.1', '::1', 'localhost'].includes(clientIp)) {
            return res.status(403).json({
                error: 'Metrics endpoint not accessible from remote clients'
            });
        }
        return next();
    }
    
    // If configured, require the header
    if (authHeader !== expectedSecret) {
        return res.status(401).json({
            error: 'Invalid metrics authentication'
        });
    }
    
    next();
};
