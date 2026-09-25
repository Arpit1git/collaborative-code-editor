import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI || 'redis://127.0.0.1:6379';

export const redisConnection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

redisConnection.on('connect', () => console.log('[Redis] Connected successfully!'));
redisConnection.on('error', (err) => console.error('[Redis] Connection error:', err.message));
