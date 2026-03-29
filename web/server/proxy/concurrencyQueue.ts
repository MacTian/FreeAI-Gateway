/**
 * Concurrency Queue Module
 * Per-account in-flight limit with waiting queue
 */

const inFlightMap = new Map<string, number>()   // accountId -> current in-flight count
const queueMap = new Map<string, Array<() => void>>()  // accountId -> waiters

const DEFAULT_MAX_CONCURRENCY = 3

function getMaxConcurrency(): number {
  return DEFAULT_MAX_CONCURRENCY
}

/**
 * Acquire a slot for the given account.
 * If the account is at capacity, waits in queue until a slot is free.
 */
export function acquireSlot(accountId: string): Promise<void> {
  const current = inFlightMap.get(accountId) || 0
  const max = getMaxConcurrency()

  if (current < max) {
    inFlightMap.set(accountId, current + 1)
    return Promise.resolve()
  }

  // Queue the waiter
  return new Promise<void>((resolve) => {
    if (!queueMap.has(accountId)) queueMap.set(accountId, [])
    queueMap.get(accountId)!.push(resolve)
  })
}

/**
 * Release a slot for the given account.
 * Wakes up the next waiter in queue if any.
 */
export function releaseSlot(accountId: string): void {
  const queue = queueMap.get(accountId) || []
  if (queue.length > 0) {
    const next = queue.shift()!
    // Keep in-flight count the same (slot transferred to next waiter)
    next()
    return
  }
  const current = inFlightMap.get(accountId) || 1
  inFlightMap.set(accountId, Math.max(0, current - 1))
}

/**
 * Get current stats for an account
 */
export function getSlotStats(accountId: string): { inFlight: number; queued: number; max: number } {
  return {
    inFlight: inFlightMap.get(accountId) || 0,
    queued: (queueMap.get(accountId) || []).length,
    max: getMaxConcurrency(),
  }
}

/**
 * Get stats for all accounts
 */
export function getAllSlotStats(): Record<string, { inFlight: number; queued: number; max: number }> {
  const result: Record<string, { inFlight: number; queued: number; max: number }> = {}
  for (const [accountId] of inFlightMap) {
    result[accountId] = getSlotStats(accountId)
  }
  return result
}
