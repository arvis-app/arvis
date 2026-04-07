import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase before importing
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: { access_token: 'test-token' } } }),
    },
  }),
}))

describe('invokeEdgeFunction', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    globalThis.fetch = vi.fn()
  })

  it('retries on network error with exponential backoff', async () => {
    const { invokeEdgeFunction } = await import('../supabaseClient.js')

    let callCount = 0
    globalThis.fetch = vi.fn(async () => {
      callCount++
      if (callCount < 3) throw new Error('network error')
      return { ok: true, json: () => Promise.resolve({ success: true }) }
    })

    const result = await invokeEdgeFunction('test-fn', {})
    expect(result).toEqual({ success: true })
    expect(callCount).toBe(3)
  })

  it('does not retry on 4xx errors', async () => {
    const { invokeEdgeFunction } = await import('../supabaseClient.js')

    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      json: () => Promise.resolve({ error: 'HTTP 401 Unauthorized' }),
    }))

    await expect(invokeEdgeFunction('test-fn', {})).rejects.toThrow('HTTP 401')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })
})
