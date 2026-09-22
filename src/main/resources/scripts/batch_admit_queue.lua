-- Atomic Queue Batch Admission via Redis Sorted Set
-- KEYS[1]: Queue key (e.g., queue:{eventId})
-- ARGV[1]: Batch size (N users to admit)

local queue_key = KEYS[1]
local batch_size = tonumber(ARGV[1])

if batch_size <= 0 then
    return {}
end

-- Retrieve up to batch_size members from the front of the queue
local users = redis.call('ZRANGE', queue_key, 0, batch_size - 1)

if #users > 0 then
    -- Atomically remove the admitted users from the queue
    redis.call('ZREMRANGEBYRANK', queue_key, 0, #users - 1)
end

return users
