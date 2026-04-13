import * as Sentry from '@sentry/react'

export function logError(context, error, extra) {
  console.error(`[${context}]`, error)
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(error instanceof Error ? error : new Error(error?.message || JSON.stringify(error)), {
      tags: { context },
      extra,
    })
  }
}
