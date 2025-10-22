export const AGENT_TIMEOUTS = {
  DEFAULT_WORK_TIMEOUT: process.env.DEFAULT_WORK_TIMEOUT || 60000, // 1 minute default timeout
  DEFAULT_PING_INTERVAL: process.env.DEFAULT_PING_INTERVAL || 10000, // 10 seconds ping interval
  MAX_RETRY_COUNT: process.env.MAX_RETRY_COUNT || 3,
  RETRY_BACKOFF_MULTIPLIER: process.env.RETRY_BACKOFF_MULTIPLIER || 1.5, // Each retry will wait 1.5x longer
} as const;