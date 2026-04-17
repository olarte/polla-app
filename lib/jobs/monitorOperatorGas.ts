/**
 * Monitor operator wallet CELO balance.
 *
 * Records a row in operator_gas_metrics on every run so the admin
 * health endpoint (and a future dashboard) has a trail. Alerts via
 * the console alert stub — no Slack wired yet.
 *
 * Thresholds:
 *   - balance < 0.5 CELO → alert_level='block'  → settle job skips
 *   - balance < 2.0 CELO → alert_level='warn'   → refill soon
 *   - otherwise          → alert_level='ok'
 *
 * Idempotent: writing a new metrics row is always safe.
 */

import { supabaseParlay } from './supabase'
import {
  classifyBalance,
  getOperatorBalance,
  GAS_WARN_WEI,
  GAS_BLOCK_WEI,
} from '@/lib/contracts/parlayOperator'
import { sendAlert } from '@/lib/alerts'

export interface MonitorGasResult {
  balance_wei: string
  alert_level: 'ok' | 'warn' | 'block'
}

export async function runMonitorOperatorGas(): Promise<MonitorGasResult> {
  const balance = await getOperatorBalance()
  const level = classifyBalance(balance)

  const { error } = await supabaseParlay.from('operator_gas_metrics').insert({
    balance_wei: balance.toString(),
    alert_level: level,
  })
  if (error) {
    console.error('monitorOperatorGas: insert failed:', error.message)
  }

  if (level === 'block') {
    await sendAlert({
      level: 'error',
      title: 'Operator wallet below block threshold — settlement paused',
      details: {
        balance_wei: balance.toString(),
        threshold_wei: GAS_BLOCK_WEI.toString(),
      },
    })
  } else if (level === 'warn') {
    await sendAlert({
      level: 'warn',
      title: 'Operator wallet low — refill soon',
      details: {
        balance_wei: balance.toString(),
        threshold_wei: GAS_WARN_WEI.toString(),
      },
    })
  }

  return { balance_wei: balance.toString(), alert_level: level }
}

/**
 * Read the most recent gas snapshot. Used by the settle job to block
 * itself without doing a fresh RPC call every run — the monitor job
 * runs every 15 min, so staleness is bounded.
 */
export async function getLatestGasLevel(): Promise<'ok' | 'warn' | 'block' | null> {
  const { data, error } = await supabaseParlay
    .from('operator_gas_metrics')
    .select('alert_level, recorded_at')
    .order('recorded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data.alert_level as 'ok' | 'warn' | 'block'
}
