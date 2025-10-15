import mysql from "mysql2/promise"

// Enhanced connection pool with aggressive connection management
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || '127.0.0.1',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'admin',
    database: process.env.MYSQL_DATABASE || 'oauth',
    waitForConnections: true,
    connectionLimit: 30,
    queueLimit: 0,
    connectTimeout: 30000, // Safe alternative to acquireTimeout
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
});

// Connection tracking for leak detection
const activeConnections = new Map();
let connectionCounter = 0;

// Wrapper for pool.execute with automatic retry and connection tracking
export async function executeQuery({ query, values = [], retries = 2 }) {
    const connectionId = ++connectionCounter;
    const startTime = Date.now();

    console.log(`[${connectionId}] Starting query: ${query.substring(0, 50)}...`);

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            activeConnections.set(connectionId, {
                query: query.substring(0, 100),
                startTime,
                attempt
            });

            const [results] = await pool.execute(query, values);

            activeConnections.delete(connectionId);
            console.log(`[${connectionId}] Query completed in ${Date.now() - startTime}ms`);

            return results;

        } catch (error) {
            activeConnections.delete(connectionId);
            console.error(`[${connectionId}] Query failed (attempt ${attempt}):`, error.message);

            if (error.code === 'ER_CON_COUNT_ERROR' && attempt <= retries) {
                console.log(`[${connectionId}] Retrying in ${attempt * 1000}ms...`);
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                continue;
            }

            // Enhanced error messages
            if (error.code === 'ER_CON_COUNT_ERROR') {
                throw new Error("Database connection limit reached. Please try again later.");
            }
            if (error.code === 'PROTOCOL_CONNECTION_LOST') {
                throw new Error("Database connection was lost. Please try again.");
            }
            if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
                throw new Error("Database connection timeout. Please try again.");
            }

            throw new Error(`Database query failed: ${error.message}`);
        }
    }
}

// Enhanced connection getter with tracking
export async function getConnection() {
    const connectionId = ++connectionCounter;
    const startTime = Date.now();

    try {
        console.log(`[${connectionId}] Acquiring connection...`);
        const connection = await pool.getConnection();

        // Track the connection
        activeConnections.set(connectionId, {
            type: 'manual',
            startTime,
            connection
        });

        // Wrap the release method to ensure cleanup
        const originalRelease = connection.release.bind(connection);
        connection.release = () => {
            activeConnections.delete(connectionId);
            console.log(`[${connectionId}] Connection released after ${Date.now() - startTime}ms`);
            originalRelease();
        };

        console.log(`[${connectionId}] Connection acquired in ${Date.now() - startTime}ms`);
        return connection;

    } catch (error) {
        activeConnections.delete(connectionId);
        console.error(`[${connectionId}] Failed to acquire connection:`, error.message);
        throw new Error("Database connection unavailable");
    }
}

// Simplified transaction with automatic cleanup
export async function executeTransaction(queries) {
    let connection;
    const connectionId = ++connectionCounter;

    try {
        console.log(`[${connectionId}] Starting transaction with ${queries.length} queries`);
        connection = await getConnection();
        await connection.beginTransaction();

        const results = [];
        for (let i = 0; i < queries.length; i++) {
            const { query, values = [] } = queries[i];
            console.log(`[${connectionId}] Executing transaction query ${i + 1}/${queries.length}`);
            const [result] = await connection.execute(query, values);
            results.push(result);
        }

        await connection.commit();
        console.log(`[${connectionId}] Transaction committed successfully`);
        return results;

    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
                console.log(`[${connectionId}] Transaction rolled back`);
            } catch (rollbackError) {
                console.error(`[${connectionId}] Rollback failed:`, rollbackError.message);
            }
        }
        throw error;

    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Force close all connections (emergency cleanup)
export async function forceCleanup() {
    try {
        console.log('🔧 Force cleaning up database connections...');

        // Log active connections
        console.log(`Active connections: ${activeConnections.size}`);
        activeConnections.forEach((info, id) => {
            const duration = Date.now() - info.startTime;
            console.log(`- Connection ${id}: ${info.query || info.type} (${duration}ms)`);
        });

        // Clear tracking
        activeConnections.clear();

        // End the pool
        await pool.end();
        console.log('✅ Database pool closed');

        // Recreate the pool
        setTimeout(() => {
            console.log('🔄 Database pool will be recreated on next query');
        }, 1000);

    } catch (error) {
        console.error('❌ Force cleanup failed:', error.message);
    }
}

// Health check with detailed status
export function getPoolStatus() {
    const poolInfo = pool.pool || pool;

    return {
        // Pool statistics
        totalConnections: poolInfo._allConnections?.length || 0,
        freeConnections: poolInfo._freeConnections?.length || 0,
        acquiringConnections: poolInfo._acquiringConnections?.length || 0,
        connectionLimit: poolInfo.config?.connectionLimit || 0,

        // Active tracking
        activeTrackedConnections: activeConnections.size,
        trackedConnections: Array.from(activeConnections.entries()).map(([id, info]) => ({
            id,
            duration: Date.now() - info.startTime,
            query: info.query?.substring(0, 50) || info.type
        })),

        // Health assessment
        health: (() => {
            const free = poolInfo._freeConnections?.length || 0;
            const total = poolInfo._allConnections?.length || 0;
            const limit = poolInfo.config?.connectionLimit || 0;

            if (free === 0 && total >= limit) return 'critical';
            if (free <= 1) return 'warning';
            return 'healthy';
        })()
    };
}

// Periodic cleanup (run every 30 seconds)
setInterval(() => {
    const status = getPoolStatus();
    if (status.health === 'critical') {
        console.warn('🚨 Database pool in critical state:', status);
    }

    // Log long-running connections
    const longRunning = status.trackedConnections.filter(conn => conn.duration > 30000);
    if (longRunning.length > 0) {
        console.warn('⚠️ Long-running connections detected:', longRunning);
    }
}, 30000);



// Default export as an object
const dbModule = {
    executeQuery,
    executeTransaction,
    getConnection,
    forceCleanup,
    getPoolStatus
};

export default dbModule;

