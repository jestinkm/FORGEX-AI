-- Sliding Window Rate Limiter via Redis Sorted Set
-- KEYS[1]: Rate limit key (e.g. rate:ip:192.168.1.1)
-- ARGV[1]: Current timestamp in milliseconds
-- ARGV[2]: Window size in milliseconds
-- ARGV[3]: Maximum permitted requests within the window

local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_size = tonumber(ARGV[2])
local max_limit = tonumber(ARGV[3])
local clear_before = now - window_size

-- Remove entries outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', clear_before)

-- Count current requests within the window
local current_requests = redis.call('ZCARD', key)

if current_requests < max_limit then
    -- Add the current request timestamp
    redis.call('ZADD', key, now, now .. '-' .. redis.call('INCR', key .. ':seq'))
    -- Set expiry for key to automatically reclaim memory
    local ttl_seconds = math.ceil(window_size / 1000) + 2
    redis.call('EXPIRE', key, ttl_seconds)
    redis.call('EXPIRE', key .. ':seq', ttl_seconds)
    return 1 -- Allowed
else
    return 0 -- Rejected (Rate limit exceeded)
end
