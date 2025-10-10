import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getCachedVehicles(cacheKey: string) {
  try {
    const cached = await redis.get(cacheKey);
    return cached;
  } catch (error) {
    console.error('Redis get error:', error);
    return null;
  }
}

export async function setCachedVehicles(cacheKey: string, data: any, ttl: number = 3600) {
  try {
    await redis.set(cacheKey, data, { ex: ttl });
  } catch (error) {
    console.error('Redis set error:', error);
  }
}

export async function invalidateCache(pattern: string) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error('Redis invalidate error:', error);
  }
}
