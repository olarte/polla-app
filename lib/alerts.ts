/**
 * Operations alerts.
 *
 * Session 17 ships with a console-only stub. Real Slack destinations
 * (webhook URLs, channel routing, severity) land in a dedicated
 * notifications session. The signature here matches what a Slack
 * webhook client would take so swapping in the real thing later is
 * drop-in — callers pass { level, title, details } and nothing else.
 */

export type AlertLevel = 'info' | 'warn' | 'error'

export interface AlertPayload {
  level: AlertLevel
  title: string
  details?: Record<string, unknown>
}

export async function sendAlert(alert: AlertPayload): Promise<void> {
  const tag = `[ALERT:${alert.level.toUpperCase()}]`
  if (alert.level === 'error') {
    console.error(tag, alert.title, alert.details ?? '')
  } else if (alert.level === 'warn') {
    console.warn(tag, alert.title, alert.details ?? '')
  } else {
    console.log(tag, alert.title, alert.details ?? '')
  }
}
