/**
 * Notion API Rate Limiter
 * 
 * Notion API rate limits:
 * - Standard: 3 requests per second
 * - Burst: Can handle higher rates briefly
 * - Rate limit errors: HTTP 429
 * 
 * This utility provides:
 * - Automatic rate limiting (350ms delay = ~3 req/s)
 * - Retry logic for 429 errors with exponential backoff
 * - Request tracking and logging
 */

let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 350 // milliseconds (ensures ~3 req/s max)

/**
 * Rate limit delay - ensures minimum time between requests
 */
async function rateLimitDelay(): Promise<void> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest
    await new Promise(resolve => setTimeout(resolve, delay))
  }
  
  lastRequestTime = Date.now()
}

/**
 * Retry configuration for rate limit errors
 */
const MAX_RETRIES = 5
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 30000 // 30 seconds

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1)
  return Math.min(delay, MAX_RETRY_DELAY)
}

/**
 * Check if error is a rate limit error (429)
 */
function isRateLimitError(error: any): boolean {
  return (
    error?.code === 'rate_limited' ||
    error?.status === 429 ||
    error?.message?.toLowerCase().includes('rate limit') ||
    error?.message?.toLowerCase().includes('too many requests')
  )
}

/**
 * Execute a function with rate limiting and retry logic
 * 
 * @param fn - Function to execute (should return a Promise)
 * @param operationName - Name of the operation for logging
 * @returns Result of the function
 */
export async function rateLimitedCall<T>(
  fn: () => Promise<T>,
  operationName: string = 'Notion API call',
): Promise<T> {
  let lastError: any = null
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Apply rate limiting delay before request
      await rateLimitDelay()
      
      // Execute the function
      const result = await fn()
      
      // Log successful retries
      if (attempt > 1) {
        console.log(
          `[Authority] ✅ ${operationName} succeeded after ${attempt} attempts`,
        )
      }
      
      return result
    } catch (error: any) {
      lastError = error
      
      // Check if it's a rate limit error
      if (isRateLimitError(error)) {
        if (attempt < MAX_RETRIES) {
          const retryDelay = getRetryDelay(attempt)
          console.warn(
            `[Authority] ⚠️ Rate limit hit for ${operationName} (attempt ${attempt}/${MAX_RETRIES}). Retrying in ${retryDelay}ms...`,
          )
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue
        } else {
          console.error(
            `[Authority] ❌ Rate limit exceeded for ${operationName} after ${MAX_RETRIES} attempts`,
          )
          throw new Error(
            `Rate limit exceeded: ${error.message || 'Too many requests'}`,
          )
        }
      } else {
        // Not a rate limit error, throw immediately
        throw error
      }
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw lastError || new Error('Unknown error in rateLimitedCall')
}

/**
 * Create a rate-limited wrapper for a Notion API method
 * 
 * @param method - The Notion API method to wrap
 * @param methodName - Name of the method for logging
 * @returns Wrapped method with rate limiting
 */
export function rateLimitMethod<T extends (...args: any[]) => Promise<any>>(
  method: T,
  methodName: string,
): T {
  return (async (...args: any[]) => {
    return rateLimitedCall(
      () => method(...args),
      `Notion ${methodName}`,
    )
  }) as T
}

/**
 * Rate-limited Notion Client wrapper
 * Wraps common Notion API methods with rate limiting
 */
export class RateLimitedNotionClient {
  private client: any
  private lastRequestTime: number = 0
  
  constructor(client: any) {
    this.client = client
  }
  
  /**
   * Rate-limited databases.retrieve
   */
  async databasesRetrieve(params: any) {
    return rateLimitedCall(
      () => this.client.databases.retrieve(params),
      `databases.retrieve(${params.database_id?.substring(0, 8)}...)`,
    )
  }
  
  /**
   * Rate-limited pages.create
   */
  async pagesCreate(params: any) {
    return rateLimitedCall(
      () => this.client.pages.create(params),
      `pages.create`,
    )
  }
  
  /**
   * Rate-limited pages.retrieve
   */
  async pagesRetrieve(params: any) {
    return rateLimitedCall(
      () => this.client.pages.retrieve(params),
      `pages.retrieve(${params.page_id?.substring(0, 8)}...)`,
    )
  }
  
  /**
   * Rate-limited databases.query (using our query helper)
   */
  async databasesQuery(params: any) {
    return rateLimitedCall(
      () => this.client.databases.query(params),
      `databases.query(${params.database_id?.substring(0, 8)}...)`,
    )
  }
  
  /**
   * Access original client for other methods
   */
  get original() {
    return this.client
  }
}


