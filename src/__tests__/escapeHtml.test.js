import { describe, it, expect } from 'vitest'
import DOMPurify from 'dompurify'

describe('DOMPurify sanitization', () => {
  it('strips script tags from HTML', () => {
    const dirty = '<svg onload="alert(1)"><circle cx="10" cy="10" r="5"/></svg>'
    const clean = DOMPurify.sanitize(dirty, { USE_PROFILES: { svg: true } })
    expect(clean).not.toContain('onload')
    expect(clean).toContain('<circle')
  })

  it('strips event handlers from SVG', () => {
    const dirty = '<svg><rect onclick="steal()" width="10" height="10"/></svg>'
    const clean = DOMPurify.sanitize(dirty, { USE_PROFILES: { svg: true } })
    expect(clean).not.toContain('onclick')
  })
})

describe('escapeHtml (email templates pattern)', () => {
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  }

  it('escapes script tags', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  it('escapes quotes', () => {
    expect(escapeHtml('Dr. "Test"')).toBe('Dr. &quot;Test&quot;')
  })

  it('handles normal names', () => {
    expect(escapeHtml('Hans Müller')).toBe('Hans Müller')
  })

  it('escapes ampersands', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B')
  })
})
