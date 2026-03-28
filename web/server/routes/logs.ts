import { Router } from 'express'
import { store } from '../store.js'

export const logsRouter = Router()

logsRouter.get('/logs', (req, res) => {
  try {
    const limit = Number(req.query.limit) || 100
    const logs = store.getLogs(limit)
    res.json(logs)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

logsRouter.delete('/logs', (_req, res) => {
  try {
    store.clearLogs()
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})

logsRouter.get('/logs/account-trend/:accountId', (req, res) => {
  try {
    const { accountId } = req.params
    const days = Number(req.query.days) || 7
    const logs = store.getLogs(1000)
    const now = Date.now()
    const trend = Array.from({ length: days }, (_, i) => {
      const date = new Date(now - (days - 1 - i) * 86400000)
      const dateStr = date.toISOString().slice(0, 10)
      const dayLogs = logs.filter((l: any) => 
        new Date(l.timestamp).toISOString().slice(0, 10) === dateStr &&
        (l.accountId === accountId)
      )
      return { date: dateStr, total: dayLogs.length, success: dayLogs.filter((l: any) => l.level !== 'error').length, error: dayLogs.filter((l: any) => l.level === 'error').length }
    })
    res.json(trend)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

logsRouter.get('/logs/stats', (_req, res) => {
  try {
    const logs = store.getLogs(1000)
    const total = logs.length
    const success = logs.filter((l: any) => l.level === 'info' || l.status === 'success').length
    const failed = logs.filter((l: any) => l.level === 'error' || l.status === 'error').length
    res.json({ total, success, failed, warn: total - success - failed })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

logsRouter.get('/logs/trend', (req, res) => {
  try {
    const days = Number(req.query.days) || 7
    const logs = store.getLogs(1000)
    const now = Date.now()
    const trend = Array.from({ length: days }, (_, i) => {
      const date = new Date(now - (days - 1 - i) * 86400000)
      const dateStr = date.toISOString().slice(0, 10)
      const dayLogs = logs.filter(l => new Date(l.timestamp).toISOString().slice(0, 10) === dateStr)
      return {
        date: dateStr,
        total: dayLogs.length,
        success: dayLogs.filter((l: any) => l.status === 'success').length,
        error: dayLogs.filter((l: any) => l.status === 'error').length,
      }
    })
    res.json(trend)
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
})
