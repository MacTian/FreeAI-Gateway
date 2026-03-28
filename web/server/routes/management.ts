import { Router } from 'express'
import { store } from '../store.js'
import { randomUUID } from 'crypto'

export const managementRouter = Router()

managementRouter.get('/management/config', (_req, res) => {
  try {
    const config = store.getConfig()
    res.json((config as any).managementApi || { enabled: false, secret: '' })
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

managementRouter.put('/management/config', (req, res) => {
  try {
    store.updateConfig({ managementApi: req.body } as any)
    res.json(req.body)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})

managementRouter.post('/management/secret', (_req, res) => {
  try {
    const secret = randomUUID().replace(/-/g, '')
    store.updateConfig({ managementApi: { secret, enabled: true } } as any)
    res.json(secret)
  } catch (e: any) { res.status(500).json({ error: e.message }) }
})
