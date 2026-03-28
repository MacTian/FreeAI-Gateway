import { Router } from 'express'
import { store } from '../store.js'

export const sessionsRouter = Router()

// 静态路由必须在 /:id 之前

sessionsRouter.get('/sessions/active', (_req, res) => {
  try {
    const sessions = store.getSessions().filter((s: any) => !s.endedAt)
    res.json(sessions)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

sessionsRouter.post('/sessions/clean', (_req, res) => {
  try {
    const sessions = store.getSessions()
    const now = Date.now()
    const expired = sessions.filter((s: any) => s.endedAt || (now - s.createdAt > 3600000))
    expired.forEach((s: any) => store.deleteSession(s.id))
    res.json({ success: true, cleaned: expired.length })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

sessionsRouter.get('/sessions/config', (_req, res) => {
  try {
    const config = store.getConfig()
    res.json(config.sessionConfig || { maxSessions: 10, sessionTimeout: 3600000, cleanupInterval: 300000 })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

sessionsRouter.put('/sessions/config', (req, res) => {
  try {
    const updated = store.updateConfig({ sessionConfig: req.body })
    res.json(updated.sessionConfig)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

// 动态路由

sessionsRouter.get('/sessions', (req, res) => {
  try {
    const { accountId, providerId } = req.query
    let sessions = store.getSessions()
    if (accountId) sessions = sessions.filter((s: any) => s.accountId === accountId)
    if (providerId) sessions = sessions.filter((s: any) => s.providerId === providerId)
    res.json(sessions)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

sessionsRouter.get('/sessions/:id', (req, res) => {
  try {
    const session = store.getSessions().find((s: any) => s.id === req.params.id)
    if (!session) return res.status(404).json({ error: 'Not found' })
    res.json(session)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

sessionsRouter.delete('/sessions/:id', (req, res) => {
  try {
    const ok = store.deleteSession(req.params.id)
    if (!ok) return res.status(404).json({ error: 'Not found' })
    res.json({ success: true })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

sessionsRouter.delete('/sessions', (_req, res) => {
  try { store.clearSessions(); res.json({ success: true }) } catch (e: any) { res.status(500).json({ error: e.message }) }
})
