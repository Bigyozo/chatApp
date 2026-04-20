const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const requestLog = new Map<string, number[]>();

export class RateLimitError extends Error {
    constructor() {
        super('Rate limit exceeded');
        this.name = 'RateLimitError';
    }
}

/**
 * userId ごとに sliding window レートリミットを確認する。
 * 1分間に MAX_REQUESTS を超えると RateLimitError を throw する。
 */
export function checkRateLimit(userId: string): void {
    const now = Date.now();
    const timestamps = (requestLog.get(userId) ?? []).filter(t => now - t < WINDOW_MS);
    if (timestamps.length >= MAX_REQUESTS) {
        throw new RateLimitError();
    }
    requestLog.set(userId, [...timestamps, now]);
}
