import IORedis from 'ioredis';

export const redisConnection = new IORedis({
    host: '127.0.0.1',
    port: 6379,
    maxRetriesPerRequest: null
});

redisConnection.on('connect', () => console.log('Redis connected for BullMQ!'));
redisConnection.on('error', (err) => console.error('Redis connection error:', err))