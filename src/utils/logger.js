import * as Sentry from '@sentry/react'

export function logError(context, error, extra) {
  console.error(`[${context}]`, error)
  if (process.env.REACT_APP_SENTRY_DSN) {
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      tags: { context },
      extra,
    })
  }
}
